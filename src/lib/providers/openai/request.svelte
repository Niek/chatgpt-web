<script context="module" lang="ts">
    import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
    import type { ChatCompletionResponse } from '../../ChatCompletionResponse.svelte'
    import type { ChatRequest } from '../../ChatRequest.svelte'
    import { getEndpoint } from '../../Models.svelte'
    import { getApiBase, getApiKey, getProviderId } from '../../Storage.svelte'
    import type { ChatCompletionOpts, GeneratedImage, Request, Usage } from '../../Types.svelte'
    import { getImageEndpoint } from '../../ApiUtil.svelte'
    import { getProvider, getProviderHeaders, joinApiUrl, resolveImageModel } from './providers'

export const chatRequest = async (
  request: Request,
  chatRequest: ChatRequest,
  chatResponse: ChatCompletionResponse,
  opts: ChatCompletionOpts): Promise<ChatCompletionResponse> => {
    // OpenAI Request
      const model = await chatRequest.getModel()
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
        headers: getProviderHeaders(getProviderId(), getApiKey()),
        body: JSON.stringify(request),
        signal
      }

      if (opts.streaming) {
      /**
             * Streaming request/response
             * We'll get the response a token at a time, as soon as they are ready
            */
        chatResponse.onFinish(() => {
        })
        fetchEventSource(getEndpoint(model), {
          ...fetchOptions,
          openWhenHidden: true,
          onmessage (ev) {
          // Remove updating indicator
            chatRequest.updating = 1 // hide indicator, but still signal we're updating
            chatRequest.updatingMessage = ''
            if (!chatResponse.hasFinished()) {
              if (ev.data === '[DONE]') {
              // ?? anything to do when "[DONE]"?
              } else {
                const data = JSON.parse(ev.data)
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
            if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
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
    b64_json?: string;
    media_type?: string;
    mime_type?: string;
  }

type RequestImageGeneration = {
    prompt: string;
    model: string;
    n: number;
    response_format?: 'b64_json';
  }

type ResponseImageGeneration = {
    data?: ResponseImageDetail[];
    usage?: Partial<Usage> & {
      input_tokens?: number;
      output_tokens?: number;
    };
  }

const normalizeImageUsage = (usage?: ResponseImageGeneration['usage']): Usage => {
  const promptTokens = usage?.prompt_tokens ?? usage?.input_tokens ?? 0
  const completionTokens = usage?.completion_tokens ?? usage?.output_tokens ?? 0
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: usage?.total_tokens ?? promptTokens + completionTokens
  }
}

const normalizeMediaType = (mediaType?: string): string => {
  if (!mediaType) return 'image/png'
  if (mediaType.includes('/')) return mediaType
  return `image/${mediaType === 'jpg' ? 'jpeg' : mediaType}`
}

export const imageRequest = async (
  chatRequest: ChatRequest,
  chatResponse: ChatCompletionResponse,
  opts: ChatCompletionOpts): Promise<ChatCompletionResponse> => {
  const chat = chatRequest.getChat()
  const chatSettings = chat.settings
  const count = opts.count || 1
  const prompt = opts.prompt || ''
  const providerId = getProviderId()
  const provider = getProvider(providerId)
  const endpoint = getImageEndpoint(providerId)
  if (!endpoint) {
    chatResponse.updateFromError(`Image generation is not supported by ${provider.name}.`)
    return chatResponse
  }
  chatRequest.updating = true
  chatRequest.updatingMessage = 'Generating Image...'
  const imageModel = resolveImageModel(providerId, chatSettings.imageGenerationModel)
  if (!imageModel) {
    chatResponse.updateFromError(`Choose an image model for ${provider.name}.`)
    return chatResponse
  }
  const request: RequestImageGeneration = {
    prompt,
    model: imageModel,
    n: count,
    ...(provider.image?.responseFormat ? { response_format: provider.image.responseFormat } : {})
  }
  // fetchEventSource doesn't seem to throw on abort,
  // so we deal with it ourselves
  const signal = chatRequest.controller.signal
  const abortListener = () => {
    chatRequest.updating = false
    chatRequest.updatingMessage = ''
    chatResponse.updateFromError('User aborted request.')
  }
  signal.addEventListener('abort', abortListener)
  // Create request
  const fetchOptions = {
        method: 'POST',
        headers: getProviderHeaders(providerId, getApiKey()),
        body: JSON.stringify(request),
        signal
  }

  try {
    const response = await fetch(joinApiUrl(getApiBase(), endpoint), fetchOptions)
    if (!response.ok) await chatRequest.handleError(response)

    const json = await response.json() as ResponseImageGeneration
    if (!Array.isArray(json.data) || !json.data.length) {
      throw new Error('The provider returned an invalid image response.')
    }
    const images = json.data.map((image): GeneratedImage => {
      if (!image.b64_json) {
        throw new Error('The provider returned an image without base64 data.')
      }
      return {
        b64image: image.b64_json,
        mediaType: normalizeMediaType(image.media_type || image.mime_type)
      }
    })
    await chatResponse.updateImageFromSyncResponse(images, prompt, imageModel, normalizeImageUsage(json.usage))
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    chatResponse.updateFromError(error.message)
    throw error
  } finally {
    signal.removeEventListener('abort', abortListener)
  }
  return chatResponse
}

</script>
