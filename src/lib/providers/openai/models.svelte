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
      prompt: 0.000003, // $0.003 per 1000 tokens prompt
      completion: 0.000004, // $0.004 per 1000 tokens completion
      max: 16384 // 16k max token buffer
}
const gpt4 = {
      ...chatModelBase,
      prompt: 0.00003, // $0.03 per 1000 tokens prompt
      completion: 0.00006, // $0.06 per 1000 tokens completion
      max: 8192 // 8k max token buffer
}
const gpt432k = {
      ...chatModelBase,
      prompt: 0.00006, // $0.06 per 1000 tokens prompt
      completion: 0.00012, // $0.12 per 1000 tokens completion
      max: 32768 // 32k max token buffer
}

export const chatModels : Record<string, ModelDetail> = {
  'gpt-3.5-turbo': { ...gpt35 },
  'gpt-3.5-turbo-0301': { ...gpt35 },
  'gpt-3.5-turbo-0613': { ...gpt35 },
  'gpt-3.5-turbo-16k': { ...gpt3516k },
  'gpt-4': { ...gpt4 },
  'gpt-4-0314': { ...gpt4 },
  'gpt-4-0613': { ...gpt4 },
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
      }
}

</script>