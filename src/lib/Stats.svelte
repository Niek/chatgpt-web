<script context="module" lang="ts">
  import type { Message, Model, Usage } from './Types.svelte'
  import { encode } from 'gpt-tokenizer'

  // Reference: https://openai.com/pricing#language-models
  // TODO: Move to settings of some type
  const modelDetails : Record<string, [number, number, number]> = {
    'gpt-4-32k': [0.00006, 0.00012, 32768], // $0.06 per 1000 tokens prompt, $0.12 per 1000 tokens completion, max 32k
    'gpt-4': [0.00003, 0.00006, 8192], // $0.03 per 1000 tokens prompt, $0.06 per 1000 tokens completion, max 8k
    'gpt-3.5': [0.000002, 0.000002, 4096] // $0.002 per 1000 tokens (both prompt and completion), max 4k
  }

  const tpCache = {}
  const getModelDetail = (model: Model) => {
    let r = tpCache[model]
    if (r) return r
    const k = Object.keys(modelDetails).find((k) => model.startsWith(k))
    if (k) {
      r = modelDetails[k]
    } else {
      r = [0, 0, 4096]
    }
    tpCache[model] = r
    return r
  }

  export const getPrice = (tokens: Usage, model: Model): number => {
    const t = getModelDetail(model)
    return ((tokens.prompt_tokens * t[0]) + (tokens.completion_tokens * t[1]))
  }

  export const countPromptTokens = (prompts:Message[], model:Model):number => {
    return prompts.reduce((a, m) => {
      // Not sure how OpenAI formats it, but this seems to get close to the right counts.
      // Would be nice to know. This works for gpt-3.5.  gpt-4 could be different
      a += encode('## ' + m.role + ' ##:\r\n\r\n' + m.content + '\r\n\r\n\r\n').length
      return a
    }, 0) + 3
  }

  export const getModelMaxTokens = (model:Model):number => {
    return getModelDetail(model)[2]
  }

</script>