<script context="module" lang="ts">
    import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
    import { ChatCompletionResponse } from '../../ChatCompletionResponse.svelte'
    import { ChatRequest } from '../../ChatRequest.svelte'
    import { getEndpoint, getModelDetail } from '../../Models.svelte'
    import { getApiKey } from '../../Storage.svelte'
    import type { ChatCompletionOpts, Request } from '../../Types.svelte'

export const chatRequest = async (
  request: Request,
  chatRequest: ChatRequest,
  chatResponse: ChatCompletionResponse,
  opts: ChatCompletionOpts): Promise<ChatCompletionResponse> => {
    // OpenAI Request
      const model = chatRequest.getModel()
      const signal = chatRequest.controller.signal
      const abortListener = (e:Event) => {
        chatRequest.updating = false
        chatRequest.updatingMessage = ''
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
          // chatRequest.updating = false
          // chatRequest.updatingMessage = ''
        })
        fetchEventSource(getEndpoint(model), {
          ...fetchOptions,
          openWhenHidden: true,
          onmessage (ev) {
          // Remove updating indicator
            chatRequest.updating = 1 // hide indicator, but still signal we're updating
            chatRequest.updatingMessage = ''
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
              await chatRequest.handleError(response)
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
        const response = await fetch(getEndpoint(model), fetchOptions)
        if (!response.ok) {
          await chatRequest.handleError(response)
        } else {
          const json = await response.json()
          chatResponse.updateFromSyncResponse(json)
        }
      }
      return chatResponse
}

type ResponseImageDetail = {
    url: string;
    b64_json: string;
  }

type RequestImageGeneration = {
    prompt: string;
    n?: number;
    size?: string;
    response_format?: keyof ResponseImageDetail;
  }

export const imageRequest = async (
  na: Request,
  chatRequest: ChatRequest,
  chatResponse: ChatCompletionResponse,
  opts: ChatCompletionOpts): Promise<ChatCompletionResponse> => {
  const chat = chatRequest.getChat()
  const chatSettings = chat.settings
  const count = opts.count || 1
  const prompt = opts.prompt || ''
  chatRequest.updating = true
  chatRequest.updatingMessage = 'Generating Image...'
  const imageModel = chatSettings.imageGenerationModel
  const imageModelDetail = getModelDetail(imageModel)
  const size = imageModelDetail.opt?.size || '256x256'
  const request: RequestImageGeneration = {
        prompt,
        response_format: 'b64_json',
        size,
        n: count
  }
  // fetchEventSource doesn't seem to throw on abort,
  // so we deal with it ourselves
  const signal = chatRequest.controller.signal
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

  try {
        const response = await fetch(getEndpoint(imageModel), fetchOptions)
        if (!response.ok) {
          await chatRequest.handleError(response)
        } else {
          const json = await response.json()
          // console.log('image json', json, json?.data[0])
          const images = json?.data.map(d => d.b64_json)
          chatResponse.updateImageFromSyncResponse(images, prompt, imageModel)
        }
  } catch (e) {
        chatResponse.updateFromError(e)
        throw e
  }
  return chatResponse
}

</script>