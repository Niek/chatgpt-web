<script context="module" lang="ts">
    import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
    import ChatCompletionResponse from './ChatCompletionResponse.svelte'
    import ChatRequest from './ChatRequest.svelte'
    import { getEndpoint } from './Models.svelte'
    import { getApiKey } from './Storage.svelte'
    import type { ChatCompletionOpts, Request } from './Types.svelte'

export const runOpenAiCompletionRequest = async (
  request: Request,
  chatRequest: ChatRequest,
  chatResponse: ChatCompletionResponse,
  signal: AbortSignal,
  opts: ChatCompletionOpts) => {
    // OpenAI Request
      const model = chatRequest.getModel()
      const abortListener = (e:Event) => {
        chatRequest.updating = false
        chatRequest.updatingMessage = ''
        chatResponse.updateFromError('User aborted request.')
        chatRequest.removeEventListener('abort', abortListener)
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
          chatRequest.updating = false
          chatRequest.updatingMessage = ''
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
            chatRequest.updating = false
            chatRequest.updatingMessage = ''
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
          chatRequest.updating = false
          chatRequest.updatingMessage = ''
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
          // Remove updating indicator
          chatRequest.updating = false
          chatRequest.updatingMessage = ''
          chatResponse.updateFromSyncResponse(json)
        }
      }
}
</script>