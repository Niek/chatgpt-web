<script context="module" lang="ts">
  import { apiKeyStorage, getApiBase, globalStorage } from './Storage.svelte'
  import { get } from 'svelte/store'
  import type { ModelDetail, Model, SelectOption, Chat } from './Types.svelte'
  import { mergeProfileFields } from './Profiles.svelte'
  import { getChatSettingObjectByKey } from './Settings.svelte'
  import { valueOf } from './Util.svelte'
  import { chatModels as openAiModels, imageModels as openAiImageModels, fetchRemoteModels, fallbackModelDetail } from './providers/openai/models.svelte'
  import { chatModels as petalsModels } from './providers/petals/models.svelte'

export const supportedChatModels : Record<string, ModelDetail> = {
    ...openAiModels,
    ...petalsModels
}

export const supportedImageModels : Record<string, ModelDetail> = {
    ...openAiImageModels
}

const lookupList = {
    ...supportedChatModels,
    ...supportedImageModels
}

Object.entries(lookupList).forEach(([k, v]) => {
    v.id = k
    v.modelQuery = v.modelQuery || k
})

export const supportedChatModelKeys = Object.keys({ ...supportedChatModels })

const tpCache : Record<string, ModelDetail> = {}

export const getModelDetail = (model: Model): ModelDetail => {
  // Ensure model is a string for typesafety
    if (typeof model !== 'string') {
      console.warn('Invalid type for model:', model)
      return {
        ...fallbackModelDetail,
        id: model,
        modelQuery: model
      }
    }

    // Attempt to fetch the model details directly from lookupList or cache
    let result = lookupList[model] || tpCache[model]
    if (result) {
      return result
    }

    // No direct match found, attempting to find the closest match
    const sortedKeys = Object.keys(lookupList).sort((a, b) => b.length - a.length) // Longest to shortest for best match
    const bestMatchKey = sortedKeys.find(key => model.startsWith(key))

    if (bestMatchKey) {
      result = lookupList[bestMatchKey]
    } else {
      console.warn('Unable to find model detail for:', model)
      result = {
        ...fallbackModelDetail,
        id: model,
        modelQuery: model
      }
    }

    // Cache it so we don't need to do that again
    tpCache[model] = result
    return result
}


export const getEndpoint = (model: Model): string => {
    return getModelDetail(model).getEndpoint(model)
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

export const getDelimiter = (chat: Chat): string => {
    return chat.settings.delimiter || valueOf(chat.id, getChatSettingObjectByKey('delimiter').placeholder)
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
    if (role === 'assistant') return getAssistantStart(chat) + ' '
    if (role === 'user') return getUserStart(chat) + ' '
    return getSystemStart(chat) + ' '
}

export const getRoleEnd = (role: string, model: Model, chat: Chat): string => {
    if (role === 'assistant') return getAssistantEnd(chat)
    if (role === 'user') return getUserEnd(chat)
    return getSystemEnd(chat)
}

export const getTokens = (model: Model, value: string): number[] => {
    return getModelDetail(model).getTokens(value)
}

export const countTokens = (model: Model, value: string): number => {
    return getTokens(model, value).length
}

export const hasActiveModels = (): boolean => {
    const globalSettings = get(globalStorage) || {}
    return !!get(apiKeyStorage) || !!globalSettings.enablePetals
}

const sortModelsAlphabetically = (a: SelectOption, b: SelectOption): number => {
    const aText = a.text.toLowerCase()
    const bText = b.text.toLowerCase()

    if (aText < bText) return -1
    if (aText > bText) return 1
    return 0
}

export async function getChatModelOptions (): Promise<SelectOption[]> {
    const isOpenAi = getApiBase().includes('openai.com')

    // We are checking if the OpenAI endpoint is used, so we only fetch
    // additional models for non-OpenAI endpoints
    const remoteModels = isOpenAi ? {} : await fetchRemoteModels()

    const models = Object.keys({ ...supportedChatModels, ...remoteModels })
    const modelOptionsActive:SelectOption[] = []
    const modelOptionsInactive:SelectOption[] = []
  
    for (let i = 0, l = models.length; i < l; i++) {
      const model = models[i]
      const modelDetail = getModelDetail(model)
      await modelDetail.check(modelDetail)
      const pushTarget = modelDetail.enabled ? modelOptionsActive : modelOptionsInactive
      pushTarget.push({
        value: model,
        text: modelDetail.label || model,
        disabled: !modelDetail.enabled
      })
    }

    modelOptionsActive.sort(sortModelsAlphabetically)
    modelOptionsInactive.sort(sortModelsAlphabetically)

    return [...modelOptionsActive, ...modelOptionsInactive]
}

export async function getImageModelOptions (): Promise<SelectOption[]> {
    const models = Object.keys(supportedImageModels)
    const result:SelectOption[] = [{ value: '', text: 'OFF - Disable Image Generation' }]
    for (let i = 0, l = models.length; i < l; i++) {
      const model = models[i]
      const modelDetail = getModelDetail(model)
      await modelDetail.check(modelDetail)
      result.push({
        value: model,
        text: modelDetail.label || model,
        disabled: !modelDetail.enabled
      })
    }
    return result
}

</script>