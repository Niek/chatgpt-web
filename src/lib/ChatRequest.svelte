<script context="module" lang="ts">
    import { ChatCompletionResponse } from './ChatCompletionResponse.svelte'
    import { mergeProfileFields, prepareSummaryPrompt } from './Profiles.svelte'
    import { countMessageTokens, countPromptTokens, getModelMaxTokens } from './Stats.svelte'
    import type { Chat, ChatCompletionOpts, ChatSettings, Message, Model, Request, RequestImageGeneration } from './Types.svelte'
    import { deleteMessage, getChatSettingValueNullDefault, insertMessages, getApiKey, addError, currentChatMessages, getMessages, updateMessages, deleteSummaryMessage } from './Storage.svelte'
    import { scrollToBottom, scrollToMessage } from './Util.svelte'
    import { getRequestSettingList, defaultModel } from './Settings.svelte'
    import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
    import { getApiBase, getEndpointCompletions, getEndpointGenerations } from './ApiUtil.svelte'
    import { v4 as uuidv4 } from 'uuid'
    import { get } from 'svelte/store'

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

      setChat (chat: Chat) {
        this.chat = chat
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
          errorResponse = 'Unknown Response'
        }
        throw new Error(`${response.status} - ${errorResponse}`)
      }
    
      async imageRequest (message: Message, prompt: string, count:number, messages: Message[], opts: ChatCompletionOpts, overrides: ChatSettings = {} as ChatSettings): Promise<ChatCompletionResponse> {
        const _this = this
        count = count || 1
        _this.updating = true
        _this.updatingMessage = 'Generating Image...'
        const size = this.chat.settings.imageGenerationSize
        const request: RequestImageGeneration = {
          prompt,
          response_format: 'b64_json',
          size,
          n: count
        }
        // fetchEventSource doesn't seem to throw on abort,
        // so we deal with it ourselves
        _this.controller = new AbortController()
        const signal = _this.controller.signal
        const abortListener = (e:Event) => {
          chatResponse.updateFromError('User aborted request.')
          signal.removeEventListener('abort', abortListener)
        }
        signal.addEventListener('abort', abortListener)
        // Create request
        const fetchOptions = {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request),
          signal
        }
        const chatResponse = new ChatCompletionResponse(opts)

        try {
          const response = await fetch(getApiBase() + getEndpointGenerations(), fetchOptions)
          if (!response.ok) {
            await _this.handleError(response)
          } else {
            const json = await response.json()
            // Remove updating indicator
            _this.updating = false
            _this.updatingMessage = ''
            // console.log('image json', json, json?.data[0])
            chatResponse.updateImageFromSyncResponse(json, prompt, 'dall-e-' + size)
          }
        } catch (e) {
          chatResponse.updateFromError(e)
          throw e
        }
        message.suppress = true
        return chatResponse
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
        const chat = _this.chat
        const chatSettings = _this.chat.settings
        const chatId = chat.id
        const imagePromptDetect = /^\s*(please|can\s+you|will\s+you)*\s*(give|generate|create|show|build|design)\s+(me)*\s*(an|a|set|a\s+set\s+of)*\s*([0-9]+|one|two|three|four)*\s+(image|photo|picture|pic)s*\s*(for\s+me)*\s*(of|[^a-z0-9]+|about|that\s+has|showing|with|having|depicting)\s+[^a-z0-9]*(.*)$/i
        opts.chat = chat
        _this.updating = true

        const lastMessage = messages[messages.length - 1]

        if (chatSettings.imageGenerationSize && !opts.didSummary && !opts.summaryRequest && lastMessage?.role === 'user') {
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
            return await this.imageRequest(lastMessage, im[9], n, messages, opts, overrides)
            // throw new Error('Image prompt:' + im[7])
          }
        }

        const includedRoles = ['user', 'assistant'].concat(chatSettings.useSystemPrompt ? ['system'] : [])
    
        // Submit only the role and content of the messages, provide the previous messages as well for context
        const messageFilter = (m:Message) => !m.suppress &&
          includedRoles.includes(m.role) &&
          m.content && !m.summarized
        const filtered = messages.filter(messageFilter)
    
        // If we're doing continuous chat, do it
        if (!opts.didSummary && !opts.summaryRequest && chatSettings.continuousChat) return await this.doContinuousChat(filtered, opts, overrides)
    
        const model = this.getModel()
        const maxTokens = getModelMaxTokens(model)

        // Inject hidden prompts if requested
        // if (!opts.summaryRequest)
        this.buildHiddenPromptPrefixMessages(filtered, true)
        const messagePayload = filtered
          .filter(m => { if (m.skipOnce) { delete m.skipOnce; return false } return true })
          .map(m => {
            const content = m.content + (m.appendOnce || []).join('\n'); delete m.appendOnce; return { role: m.role, content }
          }) as Message[]
    
        const chatResponse = new ChatCompletionResponse(opts)
        const promptTokenCount = countPromptTokens(messagePayload, model)
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

        // Set-up and make the request
        try {
          // Add out token count to the response handler
          // (streaming doesn't return counts, so we need to do it client side)
          chatResponse.setPromptTokenCount(promptTokenCount)

          // fetchEventSource doesn't seem to throw on abort,
          // so we deal with it ourselves
          _this.controller = new AbortController()
          const signal = _this.controller.signal
          const abortListener = (e:Event) => {
            _this.updating = false
            _this.updatingMessage = ''
            chatResponse.updateFromError('User aborted request.')
            signal.removeEventListener('abort', abortListener)
          }
          signal.addEventListener('abort', abortListener)
    
          const fetchOptions = {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getApiKey()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(request),
            signal
          }

          if (opts.streaming) {
            /**
             * Streaming request/response
             * We'll get the response a token at a time, as soon as they are ready
            */
            chatResponse.onFinish(() => {
              _this.updating = false
              _this.updatingMessage = ''
            })
            fetchEventSource(getApiBase() + getEndpointCompletions(), {
              ...fetchOptions,
              openWhenHidden: true,
              onmessage (ev) {
              // Remove updating indicator
                _this.updating = 1 // hide indicator, but still signal we're updating
                _this.updatingMessage = ''
                // console.log('ev.data', ev.data)
                if (!chatResponse.hasFinished()) {
                  if (ev.data === '[DONE]') {
                  // ?? anything to do when "[DONE]"?
                  } else {
                    const data = JSON.parse(ev.data)
                    // console.log('data', data)
                    window.setTimeout(() => { chatResponse.updateFromAsyncResponse(data) }, 1)
                  }
                }
              },
              onclose () {
                _this.updating = false
                _this.updatingMessage = ''
                chatResponse.updateFromClose()
              },
              onerror (err) {
                console.error(err)
                throw err
              },
              async onopen (response) {
                if (response.ok && response.headers.get('content-type') === EventStreamContentType) {
                // everything's good
                } else {
                // client-side errors are usually non-retriable:
                  await _this.handleError(response)
                }
              }
            }).catch(err => {
              _this.updating = false
              _this.updatingMessage = ''
              chatResponse.updateFromError(err.message)
            })
          } else {
            /**
             * Non-streaming request/response
             * We'll get the response all at once, after a long delay
             */
            const response = await fetch(getApiBase() + getEndpointCompletions(), fetchOptions)
            if (!response.ok) {
              await _this.handleError(response)
            } else {
              const json = await response.json()
              // Remove updating indicator
              _this.updating = false
              _this.updatingMessage = ''
              chatResponse.updateFromSyncResponse(json)
            }
          }
        } catch (e) {
        // console.error(e)
          _this.updating = false
          _this.updatingMessage = ''
          chatResponse.updateFromError(e.message)
        }

        return chatResponse
      }

      private getModel (): Model {
        return this.chat.settings.model || defaultModel
      }

      private buildHiddenPromptPrefixMessages (messages: Message[], insert:boolean = false): Message[] {
        const chatSettings = this.chat.settings
        const hiddenPromptPrefix = mergeProfileFields(chatSettings, chatSettings.hiddenPromptPrefix).trim()
        const lastMessage = messages[messages.length - 1]
        const isContinue = lastMessage?.role === 'assistant' && lastMessage.finish_reason === 'length'
        const isUserPrompt = lastMessage?.role === 'user'
        if (hiddenPromptPrefix && (isUserPrompt || isContinue)) {
          let injectedPrompt = false
          const results = hiddenPromptPrefix.split(/[\s\r\n]*::EOM::[\s\r\n]*/).reduce((a, m) => {
            m = m.trim()
            if (m.length) {
              if (m.match(/[[USER_PROMPT]]/)) {
                injectedPrompt = true
                m.replace(/[[USER_PROMPT]]/g, lastMessage.content)
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
          if (injectedPrompt) results.pop()
          return results
        }
        return []
      }

      /**
       * Gets an estimate of how many extra tokens will be added that won't be part of the visible messages
       * @param filtered
       */
      private getTokenCountPadding (filtered: Message[]): number {
        let result = 0
        // add cost of hiddenPromptPrefix
        result += this.buildHiddenPromptPrefixMessages(filtered)
          .reduce((a, m) => a + countMessageTokens(m, this.getModel()), 0)
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
        const countPadding = this.getTokenCountPadding(filtered)

        // See if we have enough to apply any of the reduction modes
        const fullPromptSize = countPromptTokens(filtered, model) + countPadding
        if (fullPromptSize < chatSettings.summaryThreshold) return await continueRequest() // nothing to do yet
        const overMax = fullPromptSize > maxTokens * 0.95

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
    
          let promptSize = countPromptTokens(top.concat(rw), model) + countPadding
          while (rw.length && rw.length > pinBottom && promptSize >= chatSettings.summaryThreshold) {
            const rolled = rw.shift()
            // Hide messages we're "rolling"
            if (rolled) rolled.suppress = true
            promptSize = countPromptTokens(top.concat(rw), model) + countPadding
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
          let reductionPoolSize = countPromptTokens(rw, model)
          const ss = Math.abs(chatSettings.summarySize)
          const getSS = ():number => (ss < 1 && ss > 0)
            ? Math.round(reductionPoolSize * ss) // If summarySize between 0 and 1, use percentage of reduced
            : Math.min(ss, reductionPoolSize * 0.5) // If > 1, use token count
          const topSize = countPromptTokens(top, model)
          let maxSummaryTokens = getSS()
          let promptSummary = prepareSummaryPrompt(chatId, maxSummaryTokens)
          const summaryRequest = { role: 'user', content: promptSummary } as Message
          let promptSummarySize = countMessageTokens(summaryRequest, model)
          // Make sure there is enough room to generate the summary, and try to make sure
          // the last prompt is a user prompt as that seems to work better for summaries
          while ((topSize + reductionPoolSize + promptSummarySize + maxSummaryTokens) >= maxTokens ||
              (reductionPoolSize >= 100 && rw[rw.length - 1]?.role !== 'user')) {
            bottom.unshift(rw.pop() as Message)
            reductionPoolSize = countPromptTokens(rw, model)
            maxSummaryTokens = getSS()
            promptSummary = prepareSummaryPrompt(chatId, maxSummaryTokens)
            summaryRequest.content = promptSummary
            promptSummarySize = countMessageTokens(summaryRequest, model)
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
              }).join('\n\n')
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
              let _recount = countPromptTokens(top.concat(rw).concat([summaryRequest]).concat([summaryResponse]), model)
              while (rw.length && (_recount + maxSummaryTokens >= maxTokens)) {
                rw.shift()
                _recount = countPromptTokens(top.concat(rw).concat([summaryRequest]).concat([summaryResponse]), model)
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