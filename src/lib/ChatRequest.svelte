<script context="module" lang="ts">
    import { ChatCompletionResponse } from './ChatCompletionResponse.svelte'
    import { cleanContent, mergeProfileFields, prepareSummaryPrompt } from './Profiles.svelte'
    import { countMessageTokens, countPromptTokens, getModelMaxTokens } from './Stats.svelte'
    import type { Chat, ChatCompletionOpts, ChatSettings, Message, Model, Request } from './Types.svelte'
    import { deleteMessage, getChatSettingValueNullDefault, insertMessages, addError, currentChatMessages, getMessages, updateMessages, deleteSummaryMessage, getChat } from './Storage.svelte'
    import { scrollToBottom, scrollToMessage } from './Util.svelte'
    import { getDefaultModel, getRequestSettingList } from './Settings.svelte'
    import { v4 as uuidv4 } from 'uuid'
    import { get } from 'svelte/store'
    import { getLeadPrompt, getModelDetail } from './Models.svelte'

export class ChatRequest {
      constructor () {
        this.controller = new AbortController()
        this.updating = false
        this.updatingMessage = ''
      }
    
      private chat: Chat
      updating: boolean|number = false
      updatingMessage: string = ''
      controller:AbortController
      providerData: Record<string, any> = {}

      setChat (chat: Chat) {
        this.chat = chat
        this.chat.settings.model = this.getModel()
      }

      getChat (): Chat {
        return this.chat
      }

      getChatSettings (): ChatSettings {
        return this.chat.settings
      }

      // Common error handler
      async handleError (response) {
        let errorResponse
        try {
          const errObj = await response.json()
          errorResponse = errObj?.error?.message || errObj?.error?.code
          if (!errorResponse && response.choices && response.choices[0]) {
            errorResponse = response.choices[0]?.message?.content
          }
          errorResponse = errorResponse || 'Unexpected Response'
        } catch (e) {
          console.error(e, e.stack)
          errorResponse = 'Unknown Response'
        }
        throw new Error(`${response.status} - ${errorResponse}`)
      }
    
      /**
       * Send API request
       * @param messages
       * @param opts
       * @param overrides
       */
      async sendRequest (messages: Message[], opts: ChatCompletionOpts, overrides: ChatSettings = {} as ChatSettings): Promise<ChatCompletionResponse> {
        // TODO:  Continue to break this method down to smaller chunks
        const _this = this
        const chat = getChat(_this.chat.id)
        this.setChat(chat)
        const chatSettings = _this.chat.settings
        const chatId = chat.id
        const imagePromptDetect = /^\s*(please|can\s+you|will\s+you)*\s*(give|generate|create|show|build|design)\s+(me)*\s*(an|a|set|a\s+set\s+of)*\s*([0-9]+|one|two|three|four)*\s+(image|photo|picture|pic)s*\s*(for\s+me)*\s*(of|[^a-z0-9]+|about|that\s+has|showing|with|having|depicting)\s+[^a-z0-9]*(.*)$/i
        opts.chat = chat
        _this.updating = true

        const lastMessage = messages[messages.length - 1]
        const chatResponse = new ChatCompletionResponse(opts)
        _this.controller = new AbortController()

        if (chatSettings.imageGenerationModel && !opts.didSummary && !opts.summaryRequest && lastMessage?.role === 'user') {
          const im = lastMessage.content.match(imagePromptDetect)
          if (im) {
            // console.log('image prompt request', im)
            let n = parseInt((im[5] || '').toLowerCase().trim()
              .replace(/one/ig, '1')
              .replace(/two/ig, '2')
              .replace(/three/ig, '3')
              .replace(/four/ig, '4')
            )
            if (isNaN(n)) n = 1
            n = Math.min(Math.max(1, n), 4)
            lastMessage.suppress = true

            const imageModelDetail = getModelDetail(chatSettings.imageGenerationModel)
            return await imageModelDetail.request({} as unknown as Request, _this, chatResponse, {
              ...opts,
              prompt: im[9],
              count: n
            })
    
            // (lastMessage, im[9], n, messages, opts, overrides)
            // throw new Error('Image prompt:' + im[7])
          }
        }

        const model = this.getModel()
        const modelDetail = getModelDetail(model)
        const maxTokens = getModelMaxTokens(model)

        const includedRoles = ['user', 'assistant'].concat(chatSettings.useSystemPrompt ? ['system'] : [])
    
        // Submit only the role and content of the messages, provide the previous messages as well for context
        const messageFilter = (m:Message) => !m.suppress &&
          includedRoles.includes(m.role) &&
          m.content && !m.summarized
        const filtered = messages.filter(messageFilter)
    
        // If we're doing continuous chat, do it
        if (!opts.didSummary && !opts.summaryRequest && chatSettings.continuousChat) return await this.doContinuousChat(filtered, opts, overrides)

        // Inject hidden prompts if requested
        // if (!opts.summaryRequest)
        this.buildHiddenPromptPrefixMessages(filtered, true)
        const messagePayload = filtered
          .filter(m => { if (m.skipOnce) { delete m.skipOnce; return false } return true })
          .map(m => {
            const content = m.content + (m.appendOnce || []).join('\n'); delete m.appendOnce; return { role: m.role, content: cleanContent(chatSettings, content) }
          }) as Message[]

        // Parse system and expand prompt if needed
        if (messagePayload[0]?.role === 'system') {
          const spl = chatSettings.sendSystemPromptLast
          const sp = messagePayload[0]
          if (sp) {
            const lastSp = sp.content.split('::END-PROMPT::')
            sp.content = lastSp[0].trim()
            if (messagePayload.length > 1) {
              sp.content = sp.content.replace(/::STARTUP::[\s\S]*::EOM::/, '::EOM::')
              sp.content = sp.content.replace(/::STARTUP::[\s\S]*::START-PROMPT::/, '::START-PROMPT::')
              sp.content = sp.content.replace(/::STARTUP::[\s\S]*$/, '')
            } else {
              sp.content = sp.content.replace(/::STARTUP::[\s]*/, '')
            }
            const splitSystem = sp.content.split('::START-PROMPT::')
            if (spl) {
              messagePayload.shift()
              if (messagePayload[messagePayload.length - 1]?.role === 'user') {
                messagePayload.splice(-1, 0, sp)
              } else {
                messagePayload.push(sp)
              }
              if (splitSystem.length > 1) {
                sp.content = splitSystem.shift()?.trim() || ''
                const systemStart = splitSystem.join('\n').trim()
                messagePayload.unshift({
                  content: systemStart,
                  role: 'system'
                } as Message)
              }
            } else {
              sp.content = sp.content.replace(/::START-PROMPT::[\s]*/, '')
            }
            const eoms = (splitSystem.shift() || '').split('::EOM::')
            if (eoms.length > 1) {
              sp.content = eoms.shift()?.trim() || ''
              const ms = eoms.map((s, i) => {
                return {
                  role: (i % 2 === 0) ? 'user' : 'assistant',
                  content: s.trim()
                } as Message
              }).filter(m => m.content.length)
              messagePayload.splice(spl ? 0 : 1, 0, ...ms.concat(splitSystem.map(s => ({ role: 'system', content: s.trim() } as Message)).filter(m => m.content.length)))
            }
            const lastSpC = lastSp[1]?.trim() || ''
            if (lastSpC.length) {
              messagePayload.push({ role: 'system', content: lastSpC } as Message)
            }
          }
        }

        // Get token counts
        const promptTokenCount = countPromptTokens(messagePayload, model, chat)
        const maxAllowed = maxTokens - (promptTokenCount + 1)

        // Build the API request body
        const request: Request = {
          model: chatSettings.model,
          messages: messagePayload,
          // Provide the settings by mapping the settingsMap to key/value pairs
          ...getRequestSettingList().reduce((acc, setting) => {
            const key = setting.key
            let value = getChatSettingValueNullDefault(chatId, setting)
            if (key in overrides) value = overrides[key]
            if (typeof setting.apiTransform === 'function') {
              value = setting.apiTransform(chatId, setting, value)
            }
            if (key === 'max_tokens') {
              if (opts.maxTokens) value = opts.maxTokens // only as large as requested
              if (value > maxAllowed || value < 1) value = null // if over max model, do not define max
              if (value) value = Math.floor(value)
            }
            if (key === 'n') {
              if (opts.streaming || opts.summaryRequest) {
                /*
                Streaming goes insane with more than one completion.
                Doesn't seem like there's any way to separate the jumbled mess of deltas for the
                different completions.
                Summary should only have one completion
                */
                value = 1
              }
            }
            if (value !== null) acc[key] = value
            return acc
          }, {}),
          stream: opts.streaming
        }

        // Make the chat completion request
        try {
          // Add out token count to the response handler
          // (some endpoints do not return counts, so we need to do it client side)
          chatResponse.setPromptTokenCount(promptTokenCount)
          // run request for given model
          await modelDetail.request(request, _this, chatResponse, opts)
        } catch (e) {
        // console.error(e)
          console.error(e, e.stack)
          _this.updating = false
          _this.updatingMessage = ''
          chatResponse.updateFromError(e.message)
        }

        return chatResponse
      }

      getModel (): Model {
        return this.chat.settings.model || getDefaultModel()
      }

      private buildHiddenPromptPrefixMessages (messages: Message[], insert:boolean = false): Message[] {
        const chat = this.chat
        const chatSettings = chat.settings
        const hiddenPromptPrefix = mergeProfileFields(chatSettings, chatSettings.hiddenPromptPrefix).trim()
        const lastMessage = messages[messages.length - 1]
        const isContinue = lastMessage?.role === 'assistant' && lastMessage.finish_reason === 'length'
        const isUserPrompt = lastMessage?.role === 'user'
        let results: Message[] = []
        let injectedPrompt = false
        if (hiddenPromptPrefix && (isUserPrompt || isContinue)) {
          results = hiddenPromptPrefix.split(/[\s\r\n]*::EOM::[\s\r\n]*/).reduce((a, m) => {
            m = m.trim()
            if (m.length) {
              if (m.match(/\[\[USER_PROMPT\]\]/)) {
                injectedPrompt = true
                m = m.replace(/\[\[USER_PROMPT\]\]/g, lastMessage.content)
              }
              a.push({ role: a.length % 2 === 0 ? 'user' : 'assistant', content: m } as Message)
            }
            return a
          }, [] as Message[])
          if (insert) {
            results.forEach(m => { messages.splice(messages.length - (isContinue ? 2 : 1), 0, m) })
            const userMessage = messages[messages.length - 2]
            if (chatSettings.hppContinuePrompt && isContinue && userMessage && userMessage.role === 'user') {
              // If we're using a hiddenPromptPrefix and we're also continuing a truncated completion,
              // stuff the continue completion request into the last user message to help the
              // continuation be more influenced by the hiddenPromptPrefix
              // (this will distort our token count estimates somewhat)
              userMessage.appendOnce = userMessage.appendOnce || []
              userMessage.appendOnce.push('\n' + chatSettings.hppContinuePrompt + '\n' + lastMessage.content)
              lastMessage.skipOnce = true
            }
          }
          if (injectedPrompt) messages.pop()
        }
        const model = this.getModel()
        const messageDetail = getModelDetail(model)
        if (getLeadPrompt(this.getChat()).trim() && messageDetail.type === 'chat') {
          const lastMessage = (results.length && injectedPrompt && !isContinue) ? results[results.length - 1] : messages[messages.length - 1]
          if (lastMessage?.role !== 'assistant') {
            const leadMessage = { role: 'assistant', content: getLeadPrompt(this.getChat()) } as Message
            if (insert) {
              messages.push(leadMessage)
            } else {
              results.push(leadMessage)
            }
          }
        }
        return results
      }

      /**
       * Gets an estimate of how many extra tokens will be added that won't be part of the visible messages
       * @param filtered
       */
      private getTokenCountPadding (filtered: Message[], chat: Chat): number {
        let result = 0
        // add cost of hiddenPromptPrefix
        result += this.buildHiddenPromptPrefixMessages(filtered)
          .reduce((a, m) => a + countMessageTokens(m, this.getModel(), chat), 0)
        // more here eventually?
        return result
      }

      private async doContinuousChat (filtered: Message[], opts: ChatCompletionOpts, overrides: ChatSettings): Promise<ChatCompletionResponse> {
        const _this = this
        const chat = _this.chat
        const chatSettings = chat.settings
        const chatId = chat.id
        const reductionMode = chatSettings.continuousChat
        const model = _this.getModel()
        const maxTokens = getModelMaxTokens(model) // max tokens for model

        const continueRequest = async () => {
          return await _this.sendRequest(getMessages(chatId), {
            ...opts,
            didSummary: true
          }, overrides)
        }

        // Get extra counts for when the prompts are finally sent.
        const countPadding = this.getTokenCountPadding(filtered, chat)

        let threshold = chatSettings.summaryThreshold
        if (threshold < 1) threshold = Math.round(maxTokens * threshold)

        // See if we have enough to apply any of the reduction modes
        const fullPromptSize = countPromptTokens(filtered, model, chat) + countPadding
        console.log('Check Continuous Chat', fullPromptSize, threshold)
        if (fullPromptSize < threshold) return await continueRequest() // nothing to do yet
        const overMax = fullPromptSize > maxTokens * 0.95
        console.log('Running Continuous Chat Reduction', fullPromptSize, threshold)

        // Isolate the pool of messages we're going to reduce
        const pinTop = chatSettings.pinTop
        let pinBottom = chatSettings.pinBottom || 2
        const systemPad = filtered[0]?.role === 'system' ? 1 : 0
        const top = filtered.slice(0, pinTop + systemPad)
        let rw = filtered.slice(pinTop + systemPad, filtered.length)
        if (pinBottom >= rw.length) pinBottom = 1
        if (pinBottom >= rw.length) {
          if (overMax) addError(chatId, 'Unable to apply continuous chat.  Check threshold, pin top and pin bottom settings.')
          return await continueRequest()
        }

        // Reduce based on mode
        if (reductionMode === 'fifo') {
          /***************************************************************
           * FIFO mode.  Roll the top off until we're under our threshold.
           * *************************************************************
           */
    
          let promptSize = countPromptTokens(top.concat(rw), model, chat) + countPadding
          while (rw.length && rw.length > pinBottom && promptSize >= threshold) {
            const rolled = rw.shift()
            // Hide messages we're "rolling"
            if (rolled) rolled.suppress = true
            promptSize = countPromptTokens(top.concat(rw), model, chat) + countPadding
          }
          // Run a new request, now with the rolled messages hidden
          return await _this.sendRequest(get(currentChatMessages), {
            ...opts,
            didSummary: true // our "summary" was simply dropping some messages
          }, overrides)
        } else if (reductionMode === 'summary') {
          /******************************************************
           * Summary mode. Reduce it all to a summary, if we can.
           * ****************************************************
           */
    
          const bottom = rw.slice(0 - pinBottom)
          let continueCounter = chatSettings.summaryExtend + 1
          rw = rw.slice(0, 0 - pinBottom)
          let reductionPoolSize = countPromptTokens(rw, model, chat)
          const ss = Math.abs(chatSettings.summarySize)
          const getSS = ():number => Math.ceil((ss < 1 && ss > 0)
            ? Math.round(reductionPoolSize * ss) // If summarySize between 0 and 1, use percentage of reduced
            : Math.min(ss, reductionPoolSize * 0.5)) // If > 1, use token count
          const topSize = countPromptTokens(top, model, chat)
          let maxSummaryTokens = getSS()
          let promptSummary = prepareSummaryPrompt(chatId, maxSummaryTokens)
          const summaryRequest = { role: 'user', content: promptSummary } as Message
          let promptSummarySize = countMessageTokens(summaryRequest, model, chat)
          // Make sure there is enough room to generate the summary, and try to make sure
          // the last prompt is a user prompt as that seems to work better for summaries
          while (rw.length > 2 && ((topSize + reductionPoolSize + promptSummarySize + maxSummaryTokens) >= maxTokens ||
              (reductionPoolSize >= 100 && rw[rw.length - 1]?.role !== 'user'))) {
            bottom.unshift(rw.pop() as Message)
            reductionPoolSize = countPromptTokens(rw, model, chat)
            maxSummaryTokens = getSS()
            promptSummary = prepareSummaryPrompt(chatId, maxSummaryTokens)
            summaryRequest.content = promptSummary
            promptSummarySize = countMessageTokens(summaryRequest, model, chat)
          }
          if (reductionPoolSize < 50) {
            if (overMax) addError(chatId, 'Check summary settings. Unable to summarize enough messages.')
            return continueRequest()
          }

          // Create a message the summary will be loaded into
          const srid = uuidv4()
          const summaryResponse:Message = {
            role: 'assistant',
            content: '',
            uuid: srid,
            streaming: opts.streaming,
            summary: [] as string[],
            model
          }

          // Insert summary completion prompt after that last message we're summarizing
          insertMessages(chatId, rw[rw.length - 1], [summaryResponse])
          if (opts.streaming) setTimeout(() => scrollToMessage(summaryResponse.uuid, 150, true, true), 0)

          // Request and load the summarization prompt
          _this.updatingMessage = 'Summarizing...'
          const summarizedIds = rw.map(m => m.uuid)
          const summaryIds = [summaryResponse.uuid]
          let loopCount = 0
          let networkRetry = 2 // number of retries on network error
          const summaryRequestMessage = summaryRequest.content
          const mergedRequest = summaryRequestMessage.includes('[[MERGED_PROMPTS]]')
          while (continueCounter-- > 0) {
            let error = false
            if (mergedRequest) {
              const mergedPrompts = rw.map(m => {
                return '[' + (m.role === 'assistant' ? '[[CHARACTER_NAME]]' : '[[USER_NAME]]') + ']\n' +
                  m.content
              }).join('\n###\n\n')
                .replaceAll('[[CHARACTER_NAME]]', chatSettings.characterName)
                .replaceAll('[[USER_NAME]]', 'Me')
              summaryRequest.content = summaryRequestMessage.replaceAll('[[MERGED_PROMPTS]]', mergedPrompts)
            }
            try {
              const summary = await _this.sendRequest(top.concat(mergedRequest ? [] : rw).concat([summaryRequest]).concat(loopCount > 0 ? [summaryResponse] : []), {
                summaryRequest: true,
                streaming: opts.streaming,
                maxTokens: chatSettings.summarySize < 0 ? 4096 : maxSummaryTokens,
                fillMessage: summaryResponse,
                autoAddMessages: true,
                onMessageChange: (m) => {
                  if (opts.streaming) scrollToMessage(summaryResponse.uuid, 150, true, true)
                }
              } as ChatCompletionOpts, {
                temperature: chatSettings.summaryTemperature, // make summary more deterministic
                top_p: 1,
                // presence_penalty: 0,
                // frequency_penalty: 0,
                ...overrides
              } as ChatSettings)
              // Wait for the response to complete
              if (!summary.hasError() && !summary.hasFinished()) await summary.promiseToFinish()
              if (summary.hasError()) {
                // Failed for some API issue. let the original caller handle it.
                _this.updating = false
                _this.updatingMessage = ''
                deleteMessage(chatId, srid)
                return summary
              }
            } catch (e) {
              console.error(e, e.stack)
              if (e.message?.includes('network error') && networkRetry > 0) {
                networkRetry--
                error = true
              } else {
                _this.updating = false
                _this.updatingMessage = ''
                deleteSummaryMessage(chatId, srid)
                throw e
              }
            }
            // Looks like we got our summarized messages.
            // Mark the new summaries as such
            // Need more?
            if ((error || summaryResponse.finish_reason === 'length') && continueCounter > 0) {
              // Our summary was truncated
              // Try to get more of it
              delete summaryResponse.finish_reason
              _this.updatingMessage = 'Summarizing more...'
              let _recount = countPromptTokens(top.concat(rw).concat([summaryRequest]).concat([summaryResponse]), model, chat)
              while (rw.length && (_recount + maxSummaryTokens >= maxTokens)) {
                rw.shift()
                _recount = countPromptTokens(top.concat(rw).concat([summaryRequest]).concat([summaryResponse]), model, chat)
              }
              loopCount++
              continue
            } else {
              // We're done
              continueCounter = 0
            }
          }
          summaryResponse.summary = summarizedIds
          // Disable the messages we summarized so they still show in history
          rw.forEach((m, i) => { m.summarized = summaryIds })
          updateMessages(chatId)
          // Re-run request with summarized prompts
          _this.updatingMessage = 'Continuing...'
          scrollToBottom(true)
          return await _this.sendRequest(get(currentChatMessages), {
            ...opts,
            didSummary: true
          },
          overrides)
        } else {
          /***************
           * Unknown mode.
           * *************
          */
          addError(chatId, `Unknown Continuous Chat Mode "${reductionMode}".`)
          return continueRequest()
        }
      }
}

</script>