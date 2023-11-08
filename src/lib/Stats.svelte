<script context="module" lang="ts">
  import { getModelDetail } from './Models.svelte'
  import type { Chat, Message, Model, Usage } from './Types.svelte'

  export const getPrice = (tokens: Usage, model: Model): number => {
    const t = getModelDetail(model)
    return ((tokens.prompt_tokens * (t.prompt || 0)) + (tokens.completion_tokens * (t.completion || 0)))
  }

  export const countPromptTokens = (prompts:Message[], model:Model, chat: Chat):number => {
    return getModelDetail(model).countPromptTokens(prompts, model, chat)
  }

  export const countMessageTokens = (message:Message, model:Model, chat: Chat):number => {
    return getModelDetail(model).countMessageTokens(message, model, chat)
  }

  export const getModelMaxTokens = (model:Model):number => {
    return getModelDetail(model).max
  }

</script>