<script context="module" lang="ts">
    import { getApiBase, getEndpointCompletions, getEndpointGenerations } from '../../ApiUtil.svelte'
    import { countTokens } from '../../Models.svelte'
    import { countMessageTokens } from '../../Stats.svelte'
    import { globalStorage } from '../../Storage.svelte'
    import type { Chat, Message, Model, ModelDetail } from '../../Types.svelte'
    import { chatRequest, imageRequest } from './request.svelte'
    import { checkModel } from './util.svelte'
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
        if (existingContent && !newContent.match(/^('(t|ll|ve|m|d|re)[^a-z]|\s|[.,;:(_-{}*^%$#@!?+=~`[\]])/i)) {
          // add a trailing space if our new content isn't a contraction
          existingContent += ' '
        }
        return existingContent
  },
  request: chatRequest,
  check: checkModel,
  getTokens: (value) => encode(value),
  getEndpoint: (model) => get(globalStorage).openAICompletionEndpoint || (getApiBase() + getEndpointCompletions()),
  hideSetting: (chatId, setting) => !!hiddenSettings[setting.key],
  countMessageTokens: (message:Message, model:Model, chat: Chat) => {
        return countTokens(model, '## ' + message.role + ' ##:\r\n\r\n' + message.content + '\r\n\r\n\r\n')
  },
  countPromptTokens: (prompts:Message[], model:Model, chat: Chat):number => {
        // Not sure how OpenAI formats it, but this seems to get close to the right counts.
        // Would be nice to know. This works for gpt-3.5.  gpt-4 could be different.
        // Complete stab in the dark here -- update if you know where all the extra tokens really come from.
        return prompts.reduce((a, m) => {
          a += countMessageTokens(m, model, chat)
          return a
        }, 0) + 3 // Always seems to be message counts + 3
  }
} as ModelDetail

// Reference: https://openai.com/pricing#language-models
const gpt35 = {
      ...chatModelBase,
      prompt: 0.0000015, // $0.0015 per 1000 tokens prompt
      completion: 0.000002, // $0.002 per 1000 tokens completion
      max: 4096 // 4k max token buffer
}
const gpt3516k = {
      ...chatModelBase,
      prompt: 0.000001, // $0.001 per 1000 tokens prompt
      completion: 0.0000015, // $0.0015 per 1000 tokens completion
      max: 16384 // 16k max token buffer
}
const gpt4 = {
      ...chatModelBase,
      prompt: 0.00003, // $0.03 per 1000 tokens prompt
      completion: 0.00006, // $0.06 per 1000 tokens completion
      max: 8192 // 8k max token buffer
}
const gpt4o = {
      ...chatModelBase,
      prompt: 0.000005, // $0.005 per 1000 tokens prompt
      completion: 0.000015, // $0.015 per 1000 tokens completion
      max: 131072 // 128k max token buffer
}
const gpt432k = {
      ...chatModelBase,
      prompt: 0.00006, // $0.06 per 1000 tokens prompt
      completion: 0.00012, // $0.12 per 1000 tokens completion
      max: 32768 // 32k max token buffer
}
const gpt4128kpreview = {
      ...chatModelBase,
      prompt: 0.00001, // $0.01 per 1000 tokens prompt
      completion: 0.00003, // $0.03 per 1000 tokens completion
      max: 131072 // 128k max token buffer
}

export const chatModels : Record<string, ModelDetail> = {
  'gpt-3.5-turbo': { ...gpt3516k },
  'gpt-3.5-turbo-0301': { ...gpt35 },
  'gpt-3.5-turbo-0613': { ...gpt35 },
  'gpt-3.5-turbo-1106': { ...gpt3516k },
  'gpt-3.5-turbo-16k': { ...gpt3516k },
  'gpt-3.5-turbo-16k-0613': { ...gpt3516k },
  'gpt-4': { ...gpt4 },
  'gpt-4o': { ...gpt4o },
  'gpt-4-turbo-preview': { ...gpt4128kpreview },
  'gpt-4-turbo-2024-04-09': { ...gpt4128kpreview },
  'gpt-4-0314': { ...gpt4 },
  'gpt-4-0613': { ...gpt4 },
  'gpt-4-1106-preview': { ...gpt4128kpreview },
  'gpt-4-0125-preview': { ...gpt4128kpreview },
  'gpt-4-32k': { ...gpt432k },
  'gpt-4-32k-0314': { ...gpt432k },
  'gpt-4-32k-0613': { ...gpt432k }
}

const imageModelBase = {
  type: 'image',
  prompt: 0.00,
  max: 1000, // 1000 char prompt, max
  request: imageRequest,
  check: checkModel,
  getTokens: (value) => [0],
  getEndpoint: (model) => getApiBase() + getEndpointGenerations(),
  hideSetting: (chatId, setting) => false
} as ModelDetail

export const imageModels : Record<string, ModelDetail> = {
      'dall-e-1024x1024': {
        ...imageModelBase,
        completion: 0.020, // $0.020 per image
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
