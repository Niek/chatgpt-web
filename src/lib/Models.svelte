<script context="module" lang="ts">
    import { getApiBase, getEndpointCompletions, getEndpointGenerations, getEndpointModels, getPetals } from './ApiUtil.svelte'
    import { apiKeyStorage, globalStorage } from './Storage.svelte'
import { get, writable } from 'svelte/store'
    import type { ModelDetail, Model, ResponseModels, SelectOption, Chat } from './Types.svelte'
import { encode } from 'gpt-tokenizer'
import llamaTokenizer from 'llama-tokenizer-js'
    import { mergeProfileFields } from './Profiles.svelte'
    import { getChatSettingObjectByKey } from './Settings.svelte'
    import { valueOf } from './Util.svelte'

/**
 * TODO: All of this + what's scattered about need to be refactored to interfaces and classes
 *       to make it all more modular
 */
const modelOptionCache = writable([] as SelectOption[])

// Reference: https://openai.com/pricing#language-models
// Eventually we'll add API hosts and endpoints to this
const modelDetails : Record<string, ModelDetail> = {
      'gpt-4-32k': {
        type: 'OpenAIChat',
        prompt: 0.00006, // $0.06 per 1000 tokens prompt
        completion: 0.00012, // $0.12 per 1000 tokens completion
        max: 32768 // 32k max token buffer
      },
      'gpt-4': {
        type: 'OpenAIChat',
        prompt: 0.00003, // $0.03 per 1000 tokens prompt
        completion: 0.00006, // $0.06 per 1000 tokens completion
        max: 8192 // 8k max token buffer
      },
      'gpt-3.5': {
        type: 'OpenAIChat',
        prompt: 0.0000015, // $0.0015 per 1000 tokens prompt
        completion: 0.000002, // $0.002 per 1000 tokens completion
        max: 4096 // 4k max token buffer
      },
      'gpt-3.5-turbo-16k': {
        type: 'OpenAIChat',
        prompt: 0.000003, // $0.003 per 1000 tokens prompt
        completion: 0.000004, // $0.004 per 1000 tokens completion
        max: 16384 // 16k max token buffer
      },
      'enoch/llama-65b-hf': {
        type: 'Petals',
        label: 'Petals - Llama-65b',
        stop: ['###', 'System:', 'Assistant:', 'User:', '</s>'],
        deliminator: '\n###\n\n',
        userStart: 'User:\n',
        userEnd: '',
        assistantStart: 'Assistant:\n',
        assistantEnd: '',
        leadPrompt: 'Assistant:\n',
        systemStart: 'System:\n',
        prompt: 0.000000, // $0.000 per 1000 tokens prompt
        completion: 0.000000, // $0.000 per 1000 tokens completion
        max: 2048 // 2k max token buffer
      },
      'timdettmers/guanaco-65b': {
        type: 'Petals',
        label: 'Petals - Guanaco-65b',
        start: '',
        stop: ['###', 'System:', 'Assistant:', 'User:', '</s>'],
        deliminator: '\n###\n\n',
        userStart: 'User:\n',
        userEnd: '',
        assistantStart: 'Assistant:\n',
        assistantEnd: '',
        leadPrompt: 'Assistant:\n',
        systemStart: 'System:\n',
        systemEnd: '',
        prompt: 0.000000, // $0.000 per 1000 tokens prompt
        completion: 0.000000, // $0.000 per 1000 tokens completion
        max: 2048 // 2k max token buffer
      },
      'meta-llama/Llama-2-70b-chat-hf': {
        type: 'Petals',
        label: 'Petals - Llama-2-70b-chat',
        start: '<s>',
        stop: ['</s>'],
        deliminator: ' </s><s>',
        userStart: '[INST][[SYSTEM_PROMPT]]',
        userEnd: ' [/INST]',
        assistantStart: '[[SYSTEM_PROMPT]][[USER_PROMPT]]',
        assistantEnd: '',
        systemStart: '<<SYS>>\n',
        systemEnd: '\n<</SYS>>\n\n',
        prompt: 0.000000, // $0.000 per 1000 tokens prompt
        completion: 0.000000, // $0.000 per 1000 tokens completion
        max: 4096 // 4k max token buffer
      },
      'meta-llama/Llama-2-70b-hf': {
        type: 'Petals',
        label: 'Petals - Llama-2-70b',
        start: '',
        stop: ['###', 'System:', 'Assistant:', 'User:', '</s>'],
        deliminator: '\n###\n\n',
        userStart: 'User:\n',
        userEnd: '',
        assistantStart: 'Assistant:\n',
        assistantEnd: '',
        leadPrompt: 'Assistant:\n',
        systemStart: 'System:\n',
        systemEnd: '',
        prompt: 0.000000, // $0.000 per 1000 tokens prompt
        completion: 0.000000, // $0.000 per 1000 tokens completion
        max: 4096 // 4k max token buffer
      },
      'stabilityai/StableBeluga2': {
        type: 'Petals',
        label: 'Petals - StableBeluga2',
        start: '',
        stop: ['###', 'System:', 'Assistant:', 'User:', '</s>'],
        deliminator: '\n###\n\n',
        userStart: 'User:\n',
        userEnd: '',
        assistantStart: 'Assistant:\n',
        assistantEnd: '',
        leadPrompt: 'Assistant:\n',
        systemStart: 'System:\n',
        systemEnd: '',
        prompt: 0.000000, // $0.000 per 1000 tokens prompt
        completion: 0.000000, // $0.000 per 1000 tokens completion
        max: 4096 // 4k max token buffer
      }
}

export const imageModels : Record<string, ModelDetail> = {
      'dall-e-1024x1024': {
        type: 'OpenAIDall-e',
        prompt: 0.00,
        completion: 0.020, // $0.020 per image
        max: 1000 // 1000 char prompt, max
      },
      'dall-e-512x512': {
        type: 'OpenAIDall-e',
        prompt: 0.00,
        completion: 0.018, // $0.018 per image
        max: 1000 // 1000 char prompt, max
      },
      'dall-e-256x256': {
        type: 'OpenAIDall-e',
        prompt: 0.00,
        completion: 0.016, // $0.016 per image
        max: 1000 // 1000 char prompt, max
      }
}

const unknownDetail = {
  prompt: 0,
  completion: 0,
  max: 4096,
  type: 'OpenAIChat'
} as ModelDetail

// See: https://platform.openai.com/docs/models/model-endpoint-compatibility
// Eventually we'll add UI for managing this
export const supportedModels : Record<string, ModelDetail> = {
      'gpt-3.5-turbo': modelDetails['gpt-3.5'],
      'gpt-3.5-turbo-0301': modelDetails['gpt-3.5'],
      'gpt-3.5-turbo-0613': modelDetails['gpt-3.5'],
      'gpt-3.5-turbo-16k': modelDetails['gpt-3.5-turbo-16k'],
      'gpt-4': modelDetails['gpt-4'],
      'gpt-4-0314': modelDetails['gpt-4'],
      'gpt-4-0613': modelDetails['gpt-4'],
      'gpt-4-32k': modelDetails['gpt-4-32k'],
      'gpt-4-32k-0314': modelDetails['gpt-4-32k'],
      'gpt-4-32k-0613': modelDetails['gpt-4-32k'],
      // 'enoch/llama-65b-hf': modelDetails['enoch/llama-65b-hf'],
      // 'timdettmers/guanaco-65b': modelDetails['timdettmers/guanaco-65b'],
      'meta-llama/Llama-2-70b-hf': modelDetails['meta-llama/Llama-2-70b-hf'],
      'stabilityai/StableBeluga2': modelDetails['stabilityai/StableBeluga2'],
      'meta-llama/Llama-2-70b-chat-hf': modelDetails['meta-llama/Llama-2-70b-chat-hf']
}

const lookupList = {
  ...imageModels,
  ...modelDetails,
  ...supportedModels
}

export const supportedModelKeys = Object.keys({ ...supportedModels, ...imageModels })

const tpCache : Record<string, ModelDetail> = {}

export const getModelDetail = (model: Model): ModelDetail => {
      // First try to get exact match, then from cache
      let r = supportedModels[model] || tpCache[model]
      if (r) return r
      // If no exact match, find closest match
      const k = Object.keys(lookupList)
        .sort((a, b) => b.length - a.length) // Longest to shortest for best match
        .find((k) => model.startsWith(k))
      if (k) {
        r = lookupList[k]
      } else {
        r = unknownDetail
      }
      // Cache it so we don't need to do that again
      tpCache[model] = r
      return r
}

export const getEndpoint = (model: Model): string => {
  const modelDetails = getModelDetail(model)
  const gSettings = get(globalStorage)
  switch (modelDetails.type) {
        case 'Petals':
          return gSettings.pedalsEndpoint || getPetals()
        case 'OpenAIDall-e':
          return getApiBase() + getEndpointGenerations()
        case 'OpenAIChat':
        default:
          return gSettings.openAICompletionEndpoint || (getApiBase() + getEndpointCompletions())
  }
}


export const getStartSequence = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.startSequence || valueOf(chat.id, getChatSettingObjectByKey('startSequence').placeholder)
      )
}

export const getStopSequence = (chat: Chat): string => {
  return chat.settings.stopSequence || valueOf(chat.id, getChatSettingObjectByKey('stopSequence').placeholder)
}

export const getDeliminator = (chat: Chat): string => {
  return chat.settings.deliminator || valueOf(chat.id, getChatSettingObjectByKey('deliminator').placeholder)
}

export const getLeadPrompt = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.leadPrompt || valueOf(chat.id, getChatSettingObjectByKey('leadPrompt').placeholder)
      )
}

export const getUserStart = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.userMessageStart || valueOf(chat.id, getChatSettingObjectByKey('userMessageStart').placeholder)
      )
}

export const getUserEnd = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.userMessageEnd || valueOf(chat.id, getChatSettingObjectByKey('userMessageEnd').placeholder)
      )
}

export const getAssistantStart = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.assistantMessageStart || valueOf(chat.id, getChatSettingObjectByKey('assistantMessageStart').placeholder)
      )
}

export const getAssistantEnd = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.assistantMessageEnd || valueOf(chat.id, getChatSettingObjectByKey('assistantMessageEnd').placeholder)
      )
}

export const getSystemStart = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.systemMessageStart || valueOf(chat.id, getChatSettingObjectByKey('systemMessageStart').placeholder)
      )
}

export const getSystemEnd = (chat: Chat): string => {
  return mergeProfileFields(
        chat.settings,
        chat.settings.systemMessageEnd || valueOf(chat.id, getChatSettingObjectByKey('systemMessageEnd').placeholder)
      )
}

export const getRoleTag = (role: string, model: Model, chat: Chat): string => {
  const modelDetails = getModelDetail(model)
  switch (modelDetails.type) {
        case 'Petals':
          if (role === 'assistant') return getAssistantStart(chat) + ' '
          if (role === 'user') return getUserStart(chat) + ' '
          return getSystemStart(chat) + ' '
        case 'OpenAIDall-e':
          return role
        case 'OpenAIChat':
        default:
          return role
  }
}

export const getRoleEnd = (role: string, model: Model, chat: Chat): string => {
  const modelDetails = getModelDetail(model)
  switch (modelDetails.type) {
        case 'Petals':
          if (role === 'assistant') return getAssistantEnd(chat)
          if (role === 'user') return getUserEnd(chat)
          return getSystemEnd(chat)
        case 'OpenAIDall-e':
          return ''
        case 'OpenAIChat':
        default:
          return ''
  }
}

export const getTokens = (model: Model, value: string): number[] => {
  const modelDetails = getModelDetail(model)
  switch (modelDetails.type) {
        case 'Petals':
          return llamaTokenizer.encode(value)
        case 'OpenAIDall-e':
          return [0]
        case 'OpenAIChat':
        default:
          return encode(value)
  }
}

export const countTokens = (model: Model, value: string): number => {
  return getTokens(model, value).length
}

export const clearModelOptionCache = () => {
  modelOptionCache.set([])
}

export async function getModelOptions (): Promise<SelectOption[]> {
  const gSettings = get(globalStorage)
  const openAiKey = get(apiKeyStorage)
  const cachedOptions = get(modelOptionCache)
  if (cachedOptions && cachedOptions.length) return cachedOptions
  // Load available models from OpenAI
  let openAiModels
  let allowCache = true
  if (openAiKey) {
        try {
          openAiModels = (await (
            await fetch(getApiBase() + getEndpointModels(), {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${openAiKey}`,
                'Content-Type': 'application/json'
              }
            })
          ).json()) as ResponseModels
        } catch (e) {
          allowCache = false
          openAiModels = { data: [] }
        }
  } else {
        openAiModels = { data: [] }
  }
  // const filteredModels = Object.keys(supportedModels).filter((model) => {
  //       switch (getModelDetail(model).type) {
  //         case 'Petals':
  //           return gSettings.enablePetals
  //         case 'OpenAIChat':
  //         default:
  //           return openAiModels.data && openAiModels.data.find((m) => m.id === model)
  //       }
  // })

  const openAiModelsLookup = openAiModels.data.reduce((a, v) => {
        a[v.id] = v
        return a
  }, {})

  const modelOptions:SelectOption[] = Object.keys(supportedModels).reduce((a, m) => {
        let disabled
        const modelDetail = getModelDetail(m)
        switch (modelDetail.type) {
          case 'Petals':
            disabled = !gSettings.enablePetals
            break
          case 'OpenAIChat':
          default:
            disabled = !(openAiModelsLookup[m])
        }
        const o:SelectOption = {
          value: m,
          text: modelDetail.label || m,
          disabled
        }
        a.push(o)
        return a
  }, [] as SelectOption[])

  if (allowCache) modelOptionCache.set(modelOptions)

  // console.log('openAiModels', openAiModels, openAiModelsLookup)

  return modelOptions
}

</script>