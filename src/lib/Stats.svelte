<script context="module" lang="ts">
  import { getModelDetail } from './Models.svelte'
  import type { Message, Model, Usage } from './Types.svelte'
  import { encode } from 'gpt-tokenizer'

  export const getPrice = (tokens: Usage, model: Model): number => {
    const t = getModelDetail(model)
    return ((tokens.prompt_tokens * t.prompt) + (tokens.completion_tokens * t.completion))
  }

  export const countPromptTokens = (prompts:Message[], model:Model):number => {
    return prompts.reduce((a, m) => {
      a += countMessageTokens(m, model)
      return a
    }, 0) + 3 // Always seems to be message counts + 3
  }

  export const countMessageTokens = (message:Message, model:Model):number => {
    // Not sure how OpenAI formats it, but this seems to get close to the right counts.
    // Would be nice to know. This works for gpt-3.5.  gpt-4 could be different.
    // Complete stab in the dark here -- update if you know where all the extra tokens really come from.
    return encode('## ' + message.role + ' ##:\r\n\r\n' + message.content + '\r\n\r\n\r\n').length
  }

  export const getModelMaxTokens = (model:Model):number => {
    return getModelDetail(model).max
  }

</script>