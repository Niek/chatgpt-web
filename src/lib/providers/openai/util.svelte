<script context="module" lang="ts">
    import { apiKeyStorage } from '../../Storage.svelte'
    import { get } from 'svelte/store'
    import type { ModelDetail } from '../../Types.svelte'
    import { getApiBase, getEndpointModels } from '../../ApiUtil.svelte'

type ResponseModels = {
  object?: string;
  data: {
    id: string;
  }[];
}

let availableModels: Record<string, boolean> | undefined

let _resetSupportedModelsTimer

export const set = (opt: Record<string, any>) => {
  availableModels = undefined
  apiKeyStorage.set(opt.apiKey || '')
}

const getSupportedModels = async (): Promise<Record<string, boolean>> => {
  if (availableModels) return availableModels
  const openAiKey = get(apiKeyStorage)
  if (!openAiKey) return {}
  try {
        const result = (await (
          await fetch(getApiBase() + getEndpointModels(), {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${openAiKey}`,
              'Content-Type': 'application/json'
            }
          })
        ).json()) as ResponseModels
        availableModels = result.data.reduce((a, v) => {
          a[v.id] = v
          return a
        }, {})
        return availableModels
  } catch (e) {
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
        // image request.  If we have any models, allow image endpoint
        modelDetail.enabled = !!Object.keys(supportedModels).length
  }
}

</script>