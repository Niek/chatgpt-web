<script context="module" lang="ts">
    import { ChatCompletionResponse } from '../../ChatCompletionResponse.svelte'
    import { ChatRequest } from '../../ChatRequest.svelte'
    import { countTokens, getDelimiter, getEndpoint, getLeadPrompt, getModelDetail, getRoleEnd, getRoleTag, getStartSequence, getStopSequence } from '../../Models.svelte'
    import type { ChatCompletionOpts, Message, Request } from '../../Types.svelte'
    import { getModelMaxTokens } from '../../Stats.svelte'
    import { updateMessages } from '../../Storage.svelte'
    import { escapeRegex } from '../../Util.svelte'

const levenshteinDistance = (str1 = '', str2 = '') => {
  const track = Array(str2.length + 1).fill(null).map(() =>
        Array(str1.length + 1).fill(null))
  for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i
  }
  for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j
  }
  for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
          track[j][i] = Math.min(
            track[j][i - 1] + 1, // deletion
            track[j - 1][i] + 1, // insertion
            track[j - 1][i - 1] + indicator // substitution
          )
        }
  }
  return track[str2.length][str1.length]
}

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
      const signal = chatRequest.controller.signal
      const providerData = chatRequest.providerData.petals || {}
      chatRequest.providerData.petals = providerData
      const modelChanged = model !== providerData.lastModel
      providerData.lastModel = model
      let ws: WebSocket = providerData.ws
      const abortListener = (e:Event) => {
        chatRequest.updating = false
        chatRequest.updatingMessage = ''
        chatResponse.updateFromError('User aborted request.')
        signal.removeEventListener('abort', abortListener)
        ws.close()
      }
      signal.addEventListener('abort', abortListener)
      const startSequence = getStartSequence(chat)
      let stopSequences = [...new Set(getStopSequence(chat).split(',').filter(s => s.trim()).concat((modelDetail.stop || ['###', '</s>']).slice()))]
      let stopSequence = stopSequences[0] || '###'
      if (startSequence.length) {
        const sld = stopSequences.slice()
          .filter(s => s === '###' || '</s>' || countTokens(model, s) === 1)
          .sort((a, b) => levenshteinDistance(a, startSequence) - levenshteinDistance(b, startSequence))
        stopSequence = sld[0] || stopSequence
      }
      stopSequences.push(stopSequence)
    
      const delimiter = getDelimiter(chat)
      const leadPromptSequence = getLeadPrompt(chat)
      if (delimiter) stopSequences.unshift(delimiter.trim())
      stopSequences = stopSequences.sort((a, b) => b.length - a.length)
      const stopSequencesC = stopSequences.filter(s => s !== stopSequence)
      const maxTokens = getModelMaxTokens(model)
      const userAfterSystem = true
    
      // Enforce strict order of messages
      const fMessages = (request.messages || [] as Message[])
      const rMessages = fMessages.reduce((a, m, i) => {
        a.push(m)
        // if (m.role === 'system') m.content = m.content.trim()
        const nm = fMessages[i + 1]
        if (userAfterSystem && m.role === 'system' && (!nm || nm.role !== 'user')) {
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
      const buildInputArray = (a: Message[]) => {
        return a.reduce((a, m, i) => {
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
      }
      const lastMessage = rMessages[rMessages.length - 1]
      let doLead = true
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = leadPromptSequence + lastMessage.content
        doLead = false
      }
      // const inputArray = buildInputArray(rMessages).map(m => m.content)
      const lInputArray = doLead
        ? (rMessages.length > 1 ? buildInputArray(rMessages.slice(0, -1)).map(m => m.content) : [])
        : buildInputArray(rMessages.slice()).map(m => m.content)
      const nInputArray = buildInputArray(rMessages.slice(-1)).map(m => m.content)
      const leadPrompt = (leadPromptSequence && doLead) ? delimiter + leadPromptSequence : ''
      const lastPrompt = startSequence + lInputArray.join(delimiter)
      const nextPrompt = doLead ? nInputArray.slice(-1).join('') + leadPrompt : ''
    
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
        !chatSettings.holdSocket && ws.close()
      })

      let maxLen = Math.min(opts.maxTokens || chatSettings.max_tokens || maxTokens, maxTokens)

      let midDel = ''
      for (let i = 0, l = delimiter.length; i < l; i++) {
        const chk = delimiter.slice(0, i)
        if ((providerData.knownBuffer || '').slice(0 - (i + 1)) === chk) midDel = chk
      }
      midDel = midDel.length ? delimiter.slice(0, 0 - midDel.length) : delimiter

      let inputPrompt = doLead ? midDel : ''

      const getNewWs = ():Promise<WebSocket> => new Promise<WebSocket>((resolve, reject) => {
        // console.warn('requesting new ws')
        const nws = new WebSocket(getEndpoint(model))
        let opened = false
        let done = false
        nws.onmessage = event => {
          if (done) return
          done = true
          const response = JSON.parse(event.data)
          if (!response.ok) {
            const err = new Error('Error opening socket: ' + response.traceback)
            chatResponse.updateFromError(err.message)
            console.error(err)
            reject(err)
          }
          nws.onerror = err => {
            console.error(err)
            throw err
          }
          // console.warn('got new ws')
          inputPrompt = lastPrompt + (doLead && lInputArray.length ? delimiter : '')
          providerData.knownBuffer = ''
          providerData.ws = nws
          resolve(nws)
        }
        nws.onclose = () => {
          chatResponse.updateFromClose()
        }
        nws.onerror = err => {
          if (done) return
          done = true
          console.error(err)
          reject(err)
        }
        nws.onopen = () => {
          if (opened) return
          opened = true
          const promptTokenCount = countTokens(model, lastPrompt + delimiter + nextPrompt)
          if (promptTokenCount > maxLen) {
            maxLen = Math.min(maxLen + promptTokenCount, maxTokens)
          }
          // update with real count
          chatResponse.setPromptTokenCount(promptTokenCount)
          const req = {
            type: 'open_inference_session',
            model,
            max_length: chatSettings.holdSocket ? maxTokens : maxLen
          } as any
          nws.send(JSON.stringify(req))
        }
      })

      const wsOpen = (ws && ws.readyState === WebSocket.OPEN)

      if (!chatSettings.holdSocket || wsOpen) {
        const rgxp = new RegExp('(<s>|</s>|\\s|' + escapeRegex(stopSequence) + ')', 'g')
        const kb = providerData.knownBuffer.replace(rgxp, '')
        const lp = lastPrompt.replace(rgxp, '')
        const lm = kb === lp
        if (!chatSettings.holdSocket || modelChanged || !lm ||
            countTokens(model, providerData.knownBuffer + inputPrompt) >= maxTokens) {
          wsOpen && ws.close()
          ws = await getNewWs()
        }
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        ws = await getNewWs()
      }

      inputPrompt += nextPrompt
      providerData.knownBuffer += inputPrompt
    
      // console.log(
      //   '\n\n*** inputPrompt: ***\n\n',
      //   inputPrompt
    
      // )
    
      const petalsRequest = {
        type: 'generate',
        inputs: inputPrompt,
        max_new_tokens: 1, // wait for up to 1 tokens before displaying
        stop_sequence: stopSequence,
        do_sample: 1, // enable top p and the like
        temperature,
        top_p: topP,
        repetition_penalty: chatSettings.repetitionPenalty
      } as any
      if (stopSequencesC.length) petalsRequest.extra_stop_sequences = stopSequencesC
      // Update token count
      chatResponse.setPromptTokenCount(countTokens(model, providerData.knownBuffer))
      ws.onmessage = event => {
        // Remove updating indicator
        chatRequest.updating = chatRequest.updating && 1 // hide indicator, but still signal we're updating
        chatRequest.updatingMessage = ''
        const response = JSON.parse(event.data)
        if (!response.ok) {
          if (response.traceback.includes('Maximum length exceeded')) {
            return chatResponse.finish('length')
          }
          if (!chatRequest.updating) return
          const err = new Error('Error in response: ' + response.traceback)
          console.error(err)
          chatResponse.updateFromError(err.message)
          throw err
        }
        providerData.knownBuffer += response.outputs
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
                if (ss !== stopSequence) {
                  providerData.knownBuffer += stopSequence
                }
                ws.close()
              }
            }
          }
        }
      }
      ws.send(JSON.stringify(petalsRequest))
      return chatResponse
}
</script>