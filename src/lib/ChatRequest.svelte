<script context="module" lang="ts">
    import { ChatCompletionResponse } from './ChatCompletionResponse.svelte'
    import { mergeProfileFields, prepareSummaryPrompt } from './Profiles.svelte'
    import { countMessageTokens, countPromptTokens, getModelMaxTokens } from './Stats.svelte'
    import type { Chat, ChatCompletionOpts, ChatSettings, Message, Model, Request } from './Types.svelte'
    import { deleteMessage, getChatSettingValueNullDefault, insertMessages, saveChatStore, getApiKey, addError } from './Storage.svelte'
    import { scrollToBottom, scrollToMessage } from './Util.svelte'
    import { getRequestSettingList, defaultModel } from './Settings.svelte'
    import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
    import { getApiBase, getEndpointCompletions } from './ApiUtil.svelte'
    import { v4 as uuidv4 } from 'uuid'

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
        opts.chat = chat
        _this.updating = true
    
        // Submit only the role and content of the messages, provide the previous messages as well for context
        const messageFilter = (m:Message) => !m.suppress && m.role !== 'error' && m.content && !m.summarized
        const filtered = messages.filter(messageFilter)
    
        // If we're doing continuous chat, do it
        if (!opts.didSummary && !opts.summaryRequest && chatSettings.continuousChat) return await this.doContinuousChat(filtered, opts, overrides)
    
        const model = this.getModel()
        const maxTokens = getModelMaxTokens(model)

        const messagePayload = filtered.map((m, i) => { return { role: m.role, content: m.content } }) as Message[]
        // Inject hidden prompt if requested
        if (!opts.summaryRequest) this.buildHiddenPromptPrefixMessage(messagePayload, true)
    
        const chatResponse = new ChatCompletionResponse(opts)
        const promptTokenCount = countPromptTokens(messagePayload, model)
        const maxAllowed = maxTokens - (promptTokenCount + 1)

        // Build and make the request
        try {
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

          // Add out token count to the response handler
          // (streaming doesn't return counts, so we need to do it client side)
          chatResponse.setPromptTokenCount(promptTokenCount)

          const signal = _this.controller.signal

          // console.log('apikey', $apiKeyStorage)

          const fetchOptions = {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getApiKey()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(request),
            signal
          }

          // Common error handler
          const handleError = async (response) => {
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

          // fetchEventSource doesn't seem to throw on abort,
          // so we deal with it ourselves
          const abortListener = (e:Event) => {
            _this.controller = new AbortController()
            chatResponse.updateFromError('User aborted request.')
            signal.removeEventListener('abort', abortListener)
          }
          signal.addEventListener('abort', abortListener)

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
                    window.requestAnimationFrame(() => { chatResponse.updateFromAsyncResponse(data) })
                  }
                }
              },
              onclose () {
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
                  await handleError(response)
                }
              }
            }).catch(err => {
              chatResponse.updateFromError(err.message)
            })
          } else {
            /**
             * Non-streaming request/response
             * We'll get the response all at once, after a long delay
             */
            const response = await fetch(getApiBase() + getEndpointCompletions(), fetchOptions)
            if (!response.ok) {
              await handleError(response)
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

      private buildHiddenPromptPrefixMessage (messages: Message[], insert:boolean = false): Message|null {
        const chatSettings = this.chat.settings
        const hiddenPromptPrefix = mergeProfileFields(chatSettings, chatSettings.hiddenPromptPrefix).trim()
        if (hiddenPromptPrefix && messages.length && messages[messages.length - 1].role === 'user') {
          const message = { role: 'user', content: hiddenPromptPrefix } as Message
          if (insert) {
            messages.splice(messages.length - 1, 0, message)
          }
          return message
        }
        return null
      }

      private getTokenCountPadding (filtered: Message[]): number {
        const hiddenPromptMessage = this.buildHiddenPromptPrefixMessage(filtered)
        let result = 0
        if (hiddenPromptMessage) {
          // add cost of hiddenPromptPrefix
          result += countMessageTokens(hiddenPromptMessage, this.getModel())
        }
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
          return await _this.sendRequest(chat.messages, {
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
          return await _this.sendRequest(chat.messages, {
            ...opts,
            didSummary: true // our "summary" was simply dropping some messages
          }, overrides)
        } else if (reductionMode === 'summary') {
          /******************************************************
           * Summary mode. Reduce it all to a summary, if we can.
           * ****************************************************
           */
    
          const bottom = rw.slice(0 - pinBottom)
          rw = rw.slice(0, 0 - pinBottom)
          let reductionPoolSize = countPromptTokens(rw, model)
          const ss = chatSettings.summarySize
          const getSS = ():number => (ss < 1 && ss > 0)
            ? Math.round(reductionPoolSize * ss) // If summarySize between 0 and 1, use percentage of reduced
            : Math.min(ss, reductionPoolSize * 0.5) // If > 1, use token count
          let maxSummaryTokens = getSS()
          let promptSummary = prepareSummaryPrompt(chatId, maxSummaryTokens)
          const summaryRequest = { role: 'user', content: promptSummary } as Message
          let promptSummarySize = countMessageTokens(summaryRequest, model)
          // Make sure there is enough room to generate the summary, and try to make sure
          // the last prompt is a user prompt as that seems to work better for summaries
          while ((reductionPoolSize + promptSummarySize + maxSummaryTokens) >= maxTokens ||
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
          try {
            const summary = await _this.sendRequest(top.concat(rw).concat([summaryRequest]), {
              summaryRequest: true,
              streaming: opts.streaming,
              maxTokens: maxSummaryTokens,
              fillMessage: summaryResponse,
              autoAddMessages: true,
              onMessageChange: (m) => {
                if (opts.streaming) scrollToMessage(summaryResponse.uuid, 150, true, true)
              }
            } as ChatCompletionOpts, {
              temperature: 0, // make summary more deterministic
              top_p: 0.5,
              presence_penalty: 0,
              frequency_penalty: 0,
              ...overrides
            } as ChatSettings)
            // Wait for the response to complete
            if (!summary.hasFinished()) await summary.promiseToFinish()
            if (summary.hasError()) {
            // Failed to some API issue. let the original caller handle it.
              deleteMessage(chatId, summaryResponse.uuid)
              return summary
            } else {
            // Looks like we got our summarized messages.
            // Mark the new summaries as such
              summaryResponse.summary = rw.map(m => m.uuid)
              const summaryIds = [summaryResponse.uuid]
              // Disable the messages we summarized so they still show in history
              rw.forEach((m, i) => { m.summarized = summaryIds })
              saveChatStore()
              // Re-run request with summarized prompts
              // return { error: { message: "End for now" } } as Response
              _this.updatingMessage = 'Continuing...'
              scrollToBottom(true)
              return await _this.sendRequest(chat.messages, {
                ...opts,
                didSummary: true
              },
              overrides)
            }
          } catch (e) {
            _this.updating = false
            _this.updatingMessage = ''
            deleteMessage(chatId, srid)
            throw e
          }
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