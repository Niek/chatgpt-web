<script context="module" lang="ts">
    import { apiKeyStorage, getApiBase, getProviderId } from '../../Storage.svelte'
    import { get } from 'svelte/store'
    import type { ModelDetail } from '../../Types.svelte'
    import { getEndpointModels } from '../../ApiUtil.svelte'
    import { getProvider, getProviderHeaders, joinApiUrl, normalizeApiBase, type ProviderId } from './providers'

type ResponseModels = {
  object?: string;
  data: {
    id: string;
  }[];
}

let availableModels: Record<string, boolean> | undefined

let _resetSupportedModelsTimer: ReturnType<typeof setTimeout> | undefined

export const set = (opt: Record<string, any>) => {
  resetSupportedModels()
  apiKeyStorage.set(opt.apiKey || '')
}

export const resetSupportedModels = () => {
  availableModels = undefined
  clearTimeout(_resetSupportedModelsTimer)
}

type ProviderConnection = {
  provider: ProviderId
  apiBase: string
  apiKey: string
}

const fetchModels = async ({ provider, apiBase, apiKey }: ProviderConnection): Promise<ResponseModels> => {
  const response = await fetch(joinApiUrl(normalizeApiBase(apiBase), getEndpointModels(provider)), {
    method: 'GET',
    headers: getProviderHeaders(provider, apiKey)
  })
  const result = await response.json().catch(() => ({})) as ResponseModels & { error?: { message?: string } }
  if (!response.ok) {
    const detail = result.error?.message || response.statusText || 'Unknown error'
    throw new Error(`${response.status} ${detail}`)
  }
  if (!Array.isArray(result.data)) {
    throw new Error('The provider returned an invalid models response.')
  }
  return result
}

export const testProviderConnection = async (connection: ProviderConnection): Promise<number> => {
  const result = await fetchModels(connection)
  return result.data.length
}

export const getSupportedModels = async (): Promise<Record<string, boolean>> => {
  if (availableModels) return availableModels
  const openAiKey = get(apiKeyStorage)
  if (!openAiKey) return {}
  try {
        const result = await fetchModels({
          provider: getProviderId(),
          apiBase: getApiBase(),
          apiKey: openAiKey
        })
        availableModels = result.data.reduce((a, v) => {
          a[v.id] = true
          return a
        }, {} as Record<string, boolean>)
        return availableModels
  } catch (e) {
        console.error(e)
        availableModels = {}
        clearTimeout(_resetSupportedModelsTimer)
        _resetSupportedModelsTimer = setTimeout(() => { availableModels = undefined }, 1000)
        return availableModels
  }
}

export const checkModel = async (modelDetail: ModelDetail) => {
  const supportedModels = await getSupportedModels()
  if (modelDetail.type === 'chat' || modelDetail.type === 'instruct') {
        modelDetail.enabled = !!supportedModels[modelDetail.modelQuery || '']
  } else {
        modelDetail.enabled = getProvider(getProviderId()).supportsImageGeneration && !!Object.keys(supportedModels).length
  }
}

</script>
