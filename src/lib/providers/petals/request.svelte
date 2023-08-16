<script context="module" lang="ts">
    import { ChatCompletionResponse } from '../../ChatCompletionResponse.svelte'
    import { ChatRequest } from '../../ChatRequest.svelte'
    import { countTokens, getDeliminator, getEndpoint, getLeadPrompt, getModelDetail, getRoleEnd, getRoleTag, getStartSequence, getStopSequence } from '../../Models.svelte'
    import type { ChatCompletionOpts, Message, Request } from '../../Types.svelte'
    import { getModelMaxTokens } from '../../Stats.svelte'
    import { updateMessages } from '../../Storage.svelte'

export const chatRequest = async (
  request: Request,
  chatRequest: ChatRequest,
  chatResponse: ChatCompletionResponse,
  opts: ChatCompletionOpts): Promise<ChatCompletionResponse> => {
      // Petals
      const chat = chatRequest.getChat()
      const chatSettings = chat.settings
      const model = chatRequest.getModel()
      const modelDetail = getModelDetail(model)
      const ws = new WebSocket(getEndpoint(model))
      const signal = chatRequest.controller.signal
      const abortListener = (e:Event) => {
        chatRequest.updating = false
        chatRequest.updatingMessage = ''
        chatResponse.updateFromError('User aborted request.')
        signal.removeEventListener('abort', abortListener)
        ws.close()
      }
      signal.addEventListener('abort', abortListener)
      let stopSequences = [...new Set(getStopSequence(chat).split(',').filter(s => s.trim()).concat((modelDetail.stop || ['###', '</s>']).slice()))]
      const stopSequence = '</s>'
      stopSequences.push(stopSequence)
      const deliminator = getDeliminator(chat)
      const leadPromptSequence = getLeadPrompt(chat)
      if (deliminator) stopSequences.unshift(deliminator.trim())
      stopSequences = stopSequences.sort((a, b) => b.length - a.length)
      const stopSequencesC = stopSequences.filter(s => s !== stopSequence)
      const maxTokens = getModelMaxTokens(model)
    
      // Enforce strict order of messages
      const fMessages = (request.messages || [] as Message[])
      const rMessages = fMessages.reduce((a, m, i) => {
        a.push(m)
        const nm = fMessages[i + 1]
        if (m.role === 'system' && (!nm || nm.role !== 'user')) {
          const nc = {
            role: 'user',
            content: ''
          } as Message
          a.push(nc)
        }
        return a
      },
          [] as Message[])
      // make sure top_p and temperature are set the way we need
      let temperature = request.temperature
      if (temperature === undefined || isNaN(temperature as any)) temperature = 1
      if (!temperature || temperature <= 0) temperature = 0.01
      let topP = request.top_p
      if (topP === undefined || isNaN(topP as any)) topP = 1
      if (!topP || topP <= 0) topP = 0.01
      // build the message array
      const buildMessage = (m: Message): string => {
        return getRoleTag(m.role, model, chat) + m.content + getRoleEnd(m.role, model, chat)
      }
      const inputArray = rMessages.reduce((a, m, i) => {
        let c = buildMessage(m)
        let replace = false
        const lm = a[a.length - 1]
        // Merge content if needed
        if (lm) {
          if (lm.role === 'system' && m.role === 'user' && c.includes('[[SYSTEM_PROMPT]]')) {
            c = c.replaceAll('[[SYSTEM_PROMPT]]', lm.content)
            replace = true
          } else {
            c = c.replaceAll('[[SYSTEM_PROMPT]]', '')
          }
          if (lm.role === 'user' && m.role === 'assistant' && c.includes('[[USER_PROMPT]]')) {
            c = c.replaceAll('[[USER_PROMPT]]', lm.content)
            replace = true
          } else {
            c = c.replaceAll('[[USER_PROMPT]]', '')
          }
        }
        // Clean up merge fields on last
        if (!rMessages[i + 1]) {
          c = c.replaceAll('[[USER_PROMPT]]', '').replaceAll('[[SYSTEM_PROMPT]]', '')
        }
        const result = {
          role: m.role,
          content: c.trim()
        } as Message
        if (replace) {
          a[a.length - 1] = result
        } else {
          a.push(result)
        }
        return a
      }, [] as Message[])
      const leadPrompt = (leadPromptSequence && ((inputArray[inputArray.length - 1] || {}) as Message).role !== 'assistant') ? deliminator + leadPromptSequence : ''
      const fullPromptInput = getStartSequence(chat) + inputArray.map(m => m.content).join(deliminator) + leadPrompt
    
      let maxLen = Math.min(opts.maxTokens || chatSettings.max_tokens || maxTokens, maxTokens)
      const promptTokenCount = countTokens(model, fullPromptInput)
      if (promptTokenCount > maxLen) {
        maxLen = Math.min(maxLen + promptTokenCount, maxTokens)
      }
      // update with real count
      chatResponse.setPromptTokenCount(promptTokenCount)
      // set up the request
      chatResponse.onFinish(() => {
        const message = chatResponse.getMessages()[0]
        if (message) {
          for (let i = 0, l = stopSequences.length; i < l; i++) {
            const ss = stopSequences[i].trim()
            if (message.content.trim().endsWith(ss)) {
              message.content = message.content.trim().slice(0, message.content.trim().length - ss.length)
              updateMessages(chat.id)
            }
          }
        }
        chatRequest.updating = false
        chatRequest.updatingMessage = ''
        ws.close()
      })
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'open_inference_session',
          model,
          max_length: maxLen
        }))
        ws.onmessage = event => {
          const response = JSON.parse(event.data)
          if (!response.ok) {
            const err = new Error('Error opening socket: ' + response.traceback)
            chatResponse.updateFromError(err.message)
            console.error(err)
            throw err
          }
          const petalsRequest = {
            type: 'generate',
            inputs: fullPromptInput,
            max_new_tokens: 1, // wait for up to 1 tokens before displaying
            stop_sequence: stopSequence,
            do_sample: 1, // enable top p and the like
            temperature,
            top_p: topP
            // repitition_penalty: chatSettings.repititionPenalty
          } as any
          if (stopSequencesC.length) petalsRequest.extra_stop_sequences = stopSequencesC
          // Update token count
          chatResponse.setPromptTokenCount(promptTokenCount)
          ws.send(JSON.stringify(petalsRequest))
          ws.onmessage = event => {
            // Remove updating indicator
            chatRequest.updating = 1 // hide indicator, but still signal we're updating
            chatRequest.updatingMessage = ''
            const response = JSON.parse(event.data)
            if (!response.ok) {
              const err = new Error('Error in response: ' + response.traceback)
              console.error(err)
              chatResponse.updateFromError(err.message)
              throw err
            }
            chatResponse.updateFromAsyncResponse(
                {
                  model,
                  choices: [{
                    delta: {
                      content: response.outputs,
                      role: 'assistant'
                    },
                    finish_reason: (response.stop ? 'stop' : null)
                  }]
                } as any
            )
            if (chatSettings.aggressiveStop && !response.stop) {
              // check if we should've stopped
              const message = chatResponse.getMessages()[0]
              const pad = 10 // look back 10 characters + stop sequence
              if (message) {
                const mc = (message.content).trim()
                for (let i = 0, l = stopSequences.length; i < l; i++) {
                  const ss = stopSequences[i].trim()
                  const ind = mc.slice(0 - (ss.length + pad)).indexOf(ss)
                  if (ind > -1) {
                    const offset = (ss.length + pad) - ind
                    message.content = mc.slice(0, mc.length - offset)
                    response.stop = true
                    updateMessages(chat.id)
                    chatResponse.finish()
                    ws.close()
                  }
                }
              }
            }
          }
        }
        ws.onclose = () => {
          chatRequest.updating = false
          chatRequest.updatingMessage = ''
          chatResponse.updateFromClose()
        }
        ws.onerror = err => {
          console.error(err)
          throw err
        }
      }
      return chatResponse
}
</script>