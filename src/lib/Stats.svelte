<script context="module" lang="ts">
  // For usage stats
  import type { Model, Usage } from './Types.svelte'

  // Reference: https://openai.com/pricing#language-models
  // TODO: Move to settings of some type
  export const tokenPrice : Record<string, [number, number]> = {
    'gpt-4-32k': [0.00006, 0.00012], // $0.06 per 1000 tokens prompt, $0.12 per 1000 tokens completion
    'gpt-4': [0.00003, 0.00006], // $0.03 per 1000 tokens prompt, $0.06 per 1000 tokens completion
    'gpt-3.5': [0.000002, 0.000002] // $0.002 per 1000 tokens (both prompt and completion)
  }

  const tpCache = {}
  const getTokenPrice = (model: Model) => {
    let r = tpCache[model]
    if (r) return r
    const k = Object.keys(tokenPrice).find((k) => model.startsWith(k))
    if (k) {
      r = tokenPrice[k]
    } else {
      r = [0, 0]
    }
    tpCache[model] = r
    return r
  }

  export const getPrice = (tokens: Usage, model: Model): number => {
    const t = getTokenPrice(model)
    return ((tokens.prompt_tokens * t[0]) + (tokens.completion_tokens * t[1]))
  }

  export const totalUse = (totals: Usage[]): Usage => {
    const r = {
      completion_tokens: 0,
      prompt_tokens: 0,
      total_tokens: 0,
      total: 0
    } as Usage

    (totals || ([] as Usage[])).forEach((t) => {
      r.total += getPrice(t, t.model as any)
      r.completion_tokens += t.completion_tokens
      r.prompt_tokens += t.prompt_tokens
      r.total_tokens += t.prompt_tokens
    })

    return r
  }
</script>