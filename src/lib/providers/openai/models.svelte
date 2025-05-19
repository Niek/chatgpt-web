<script context="module" lang="ts">
  import {
    getEndpointCompletions,
    getEndpointGenerations
  } from '../../ApiUtil.svelte'
  import { countTokens } from '../../Models.svelte'
  import { countMessageTokens } from '../../Stats.svelte'
  import { getApiBase, globalStorage } from '../../Storage.svelte'
  import type { Chat, Message, Model, ModelDetail } from '../../Types.svelte'
  import { chatRequest, imageRequest } from './request.svelte'
  import { checkModel, getSupportedModels } from './util.svelte'
  import { encode } from 'gpt-tokenizer'
  import { get } from 'svelte/store'

  const hiddenSettings = {
    startSequence: true,
    stopSequence: true,
    aggressiveStop: true,
    delimiter: true,
    userMessageStart: true,
    userMessageEnd: true,
    assistantMessageStart: true,
    assistantMessageEnd: true,
    systemMessageStart: true,
    systemMessageEnd: true,
    repetitionPenalty: true,
    holdSocket: true
    // leadPrompt: true
  } as any

  const chatModelBase = {
    type: 'chat',
    help: 'Below are the settings that OpenAI allows to be changed for the API calls. See the <a target="_blank" href="https://platform.openai.com/docs/api-reference/chat/create">OpenAI API docs</a> for more details.',
    preFillMerge: (existingContent, newContent) => {
      // continuing assistant prompt. see if we need to add a space before we merge the new completion
      // there has to be a better way to do this
      if (
        existingContent &&
        !newContent.match(
          /^('(t|ll|ve|m|d|re)[^a-z]|\s|[.,;:(_-{}*^%$#@!?+=~`[\]])/i
        )
      ) {
        // add a trailing space if our new content isn't a contraction
        existingContent += ' '
      }
      return existingContent
    },
    request: chatRequest,
    check: checkModel,
    getTokens: (value) => encode(value),
    getEndpoint: (model) =>
      get(globalStorage).openAICompletionEndpoint ||
      getApiBase() + getEndpointCompletions(),
    hideSetting: (chatId, setting) => !!hiddenSettings[setting.key],
    countMessageTokens: (message: Message, model: Model, chat: Chat) => {
      return countTokens(
        model,
        '## ' +
          message.role +
          ' ##:\r\n\r\n' +
          message.content +
          '\r\n\r\n\r\n'
      )
    },
    countPromptTokens: (
      prompts: Message[],
      model: Model,
      chat: Chat
    ): number => {
      // Not sure how OpenAI formats it, but this seems to get close to the right counts.
      // Would be nice to know. This works for gpt-3.5.  gpt-4 could be different.
      // Complete stab in the dark here -- update if you know where all the extra tokens really come from.
      return (
        prompts.reduce((a, m) => {
          a += countMessageTokens(m, model, chat)
          return a
        }, 0) + 3
      ) // Always seems to be message counts + 3
    }
  } as ModelDetail

  // Reference: https://openai.com/pricing#language-models

  const gpt41 = {
    ...chatModelBase,
    prompt: 0.000002, // $2.00 per 1M input tokens
    cachedPrompt: 0.0000005, // $0.50 per 1M cached input tokens
    completion: 0.000008, // $8.00 per 1M output tokens
    max: 1047576
  }
  const gpt41mini = {
    ...chatModelBase,
    prompt: 0.0000004, // $0.40 per 1M input tokens
    cachedPrompt: 0.0000001, // $0.10 per 1M cached input tokens
    completion: 0.0000016, // $1.60 per 1M output tokens
    max: 1047576
  }
  const gpt41nano = {
    ...chatModelBase,
    prompt: 0.0000001, // $0.10 per 1M input tokens
    cachedPrompt: 0.000000025, // $0.025 per 1M cached input tokens
    completion: 0.0000004, // $0.40 per 1M output tokens
    max: 1047576
  }
  const gpt45preview = {
    ...chatModelBase,
    prompt: 0.000075, // $75.00 per 1M input tokens
    cachedPrompt: 0.0000375, // $37.50 per 1M cached input tokens
    completion: 0.00015, // $150.00 per 1M output tokens
    max: 128000 // 128K max token buffer
  }
  const gpt4o = {
    ...chatModelBase,
    prompt: 0.0000025, // $2.50 per 1M input tokens
    cachedPrompt: 0.00000125, // $1.25 per 1M cached input tokens
    completion: 0.00001, // $10.00 per 1M output tokens
    max: 128000
  }
  const gpt4omini = {
    ...chatModelBase,
    prompt: 0.00000015, // $0.00015 per 1000 tokens prompt
    cachedPrompt: 0.000000075, // $0.075 per 1M cached input tokens
    completion: 0.00000060, // $0.00060 per 1000 tokens completion
    max: 131072 // 128k max token buffer
  }
  const o1 = {
    ...chatModelBase,
    prompt: 0.000015, // $15.00 per 1M tokens prompt
    cachedPrompt: 0.0000075, // $7.50 per 1M cached input tokens
    completion: 0.00006, // $60.00 per 1M tokens completion
    max: 131072, // 128k max token buffer
    temperature: 1
  }
  const o1pro = {
    ...chatModelBase,
    prompt: 0.00015, // $150.00 per 1M tokens prompt
    completion: 0.0006, // $600.00 per 1M tokens completion
    max: 131072, // 128k max token buffer
    temperature: 1
  }
  const o3 = {
    ...chatModelBase,
    prompt: 0.00001, // $10.00 per 1M input tokens
    cachedPrompt: 0.0000025, // $2.50 per 1M cached input tokenshttps://colab.research.google.com/drive/1BJsD1TYQwBMOaUg9h84Qy2UoxnowKoBR#scrollTo=6-cl0Yjnp0-_
    completion: 0.00004, // $40.00 per 1M output tokens
    max: 200000,
    temperature: 1
  }
  const o3mini = {
    ...chatModelBase,
    prompt: 0.0000011, // $1.10 per 1M input tokens
    cachedPrompt: 0.00000055, // $0.55 per 1M cached input tokens
    completion: 0.0000044, // $4.40 per 1M output tokens
    max: 200000,
    temperature: 1
  }
  const o4mini = {
    ...chatModelBase,
    prompt: 0.0000011, // $1.10 per 1M input tokens
    cachedPrompt: 0.000000275, // $0.275 per 1M cached input tokens
    completion: 0.0000044, // $4.40 per 1M output tokens
    max: 200000,
    temperature: 1
  }
  const chatgpt4olatest = {
    ...chatModelBase,
    prompt: 0.000005, // $5.00 per 1M input tokens
    completion: 0.000015, // $15.00 per 1M output tokens
    flex: false,
    max: 128000
  }

  // Fallback model details for unknown models. Since we do not
  // know the pricing or context limits, we will assume a free
  // model with high limits.
  export const fallbackModelDetail = {
    ...chatModelBase,
    prompt: 0, // $0.00 per 1000 tokens prompt
    completion: 0, // $0.00 per 1000 tokens completion
    max: 1024000 // 1M max token buffer
  }

  export const chatModels: Record<string, ModelDetail> = {
    'gpt-4.1': { ...gpt41 },
    'gpt-4.1-mini': { ...gpt41mini },
    'gpt-4.1-nano': { ...gpt41nano },
    'gpt-4.5-preview': { ...gpt45preview },
    'gpt-4o': { ...gpt4o },
    'gpt-4o-mini': { ...gpt4omini },
    o1: { ...o1 },
    'o1-pro': { ...o1pro },
    o3: { ...o3 },
    'o3-mini': { ...o3mini },
    'o4-mini': { ...o4mini },
    'chatgpt-4o-latest': { ...chatgpt4olatest }
  }

  export const fetchRemoteModels = async () => {
    const supportedModels = await getSupportedModels()

    Object.keys(supportedModels).forEach((key) => {
      supportedModels[key] = {
        ...chatModelBase,
        ...supportedModels[key]
      }
    })

    return supportedModels
  }

  const imageModelBase = {
    type: 'image',
    prompt: 0.0,
    max: 1000, // 1000 char prompt, max
    request: imageRequest,
    check: checkModel,
    getTokens: (value) => [0],
    getEndpoint: (model) => getApiBase() + getEndpointGenerations(),
    hideSetting: (chatId, setting) => false
  } as ModelDetail

  export const imageModels: Record<string, ModelDetail> = {
    'dall-e-1024x1024': {
      ...imageModelBase,
      completion: 0.02, // $0.020 per image
      opt: {
        size: '1024x1024'
      }
    },
    'dall-e-512x512': {
      ...imageModelBase,
      completion: 0.018, // $0.018 per image
      opt: {
        size: '512x512'
      }
    },
    'dall-e-256x256': {
      ...imageModelBase,
      type: 'image',
      completion: 0.016, // $0.016 per image
      opt: {
        size: '256x256'
      }
    },
    'dall-e-3-1024x1024': {
      ...imageModelBase,
      type: 'image',
      completion: 0.04, // $0.040 per image
      opt: {
        model: 'dall-e-3',
        size: '1024x1024'
      }
    },
    'dall-e-3-1024x1792-Portrait': {
      ...imageModelBase,
      type: 'image',
      completion: 0.08, // $0.080 per image
      opt: {
        model: 'dall-e-3',
        size: '1024x1792'
      }
    },
    'dall-e-3-1792x1024-Landscape': {
      ...imageModelBase,
      type: 'image',
      completion: 0.08, // $0.080 per image
      opt: {
        model: 'dall-e-3',
        size: '1792x1024'
      }
    },
    'dall-e-3-1024x1024-HD': {
      ...imageModelBase,
      type: 'image',
      completion: 0.08, // $0.080 per image
      opt: {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd'
      }
    },
    'dall-e-3-1024x1792-Portrait-HD': {
      ...imageModelBase,
      type: 'image',
      completion: 0.12, // $0.080 per image
      opt: {
        model: 'dall-e-3',
        size: '1024x1792',
        quality: 'hd'
      }
    },
    'dall-e-3-1792x1024-Landscape-HD': {
      ...imageModelBase,
      type: 'image',
      completion: 0.12, // $0.080 per image
      opt: {
        model: 'dall-e-3',
        size: '1792x1024',
        quality: 'hd'
      }
    }
  }
</script>
