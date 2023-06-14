<script context="module" lang="ts">
    import type { ModelDetail, Model } from './Types.svelte'

// Reference: https://openai.com/pricing#language-models
// Eventually we'll add API hosts and endpoints to this
const modelDetails : Record<string, ModelDetail> = {
      'gpt-4-32k': {
        prompt: 0.00006, // $0.06 per 1000 tokens prompt
        completion: 0.00012, // $0.12 per 1000 tokens completion
        max: 32768 // 32k max token buffer
      },
      'gpt-4': {
        prompt: 0.00003, // $0.03 per 1000 tokens prompt
        completion: 0.00006, // $0.06 per 1000 tokens completion
        max: 8192 // 8k max token buffer
      },
      'gpt-3.5-turbo-0613': {
        prompt: 0.0000015, // $0.0015 per 1000 tokens prompt
        completion: 0.0000015, // $0.0015 per 1000 tokens completion
        max: 4096 // 4k max token buffer
      },
      'gpt-3.5': {
        prompt: 0.000002, // $0.002 per 1000 tokens prompt
        completion: 0.000002, // $0.002 per 1000 tokens completion
        max: 4096 // 4k max token buffer
      },
      'gpt-3.5-turbo-16k': {
        prompt: 0.000003, // $0.003 per 1000 tokens prompt
        completion: 0.000004, // $0.004 per 1000 tokens completion
        max: 16384 // 16k max token buffer
      }
}

const unknownDetail = {
  prompt: 0,
  completion: 0,
  max: 4096
}

// See: https://platform.openai.com/docs/models/model-endpoint-compatibility
// Eventually we'll add UI for managing this
export const supportedModels : Record<string, ModelDetail> = {
      'gpt-4': modelDetails['gpt-4'],
      'gpt-4-0314': modelDetails['gpt-4'],
      'gpt-4-32k': modelDetails['gpt-4-32k'],
      'gpt-4-32k-0314': modelDetails['gpt-4-32k'],
      'gpt-3.5-turbo': modelDetails['gpt-3.5'],
      'gpt-3.5-turbo-16k': modelDetails['gpt-3.5-turbo-16k'],
      'gpt-3.5-turbo-0301': modelDetails['gpt-3.5'],
      'gpt-3.5-turbo-0613': modelDetails['gpt-3.5-turbo-0613']
}

const lookupList = {
  ...modelDetails,
  ...supportedModels
}

export const supportedModelKeys = Object.keys(supportedModels)

const tpCache : Record<string, ModelDetail> = {}

export const getModelDetail = (model: Model) => {
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

</script>