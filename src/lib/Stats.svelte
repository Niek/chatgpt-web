<script context="module" lang="ts">
  import { countTokens, getModelDetail, getRoleTag } from './Models.svelte'
  import type { ChatSettings, Message, Model, Usage } from './Types.svelte'

  export const getPrice = (tokens: Usage, model: Model): number => {
    const t = getModelDetail(model)
    return ((tokens.prompt_tokens * t.prompt) + (tokens.completion_tokens * t.completion))
  }

  export const countPromptTokens = (prompts:Message[], model:Model, settings: ChatSettings):number => {
    const detail = getModelDetail(model)
    const count = prompts.reduce((a, m) => {
      switch (detail.type) {
        case 'PetalsV2Websocket':
          a += countMessageTokens(m, model, settings)
          break
        case 'OpenAIChat':
        default:
          a += countMessageTokens(m, model, settings)
      }
      return a
    }, 0)
    switch (detail.type) {
      case 'PetalsV2Websocket':
        return count + (Math.max(prompts.length - 1, 0) * countTokens(model, (detail.stop && detail.stop[0]) || '###')) // todo, make stop per model?
      case 'OpenAIChat':
      default:
        // Not sure how OpenAI formats it, but this seems to get close to the right counts.
        // Would be nice to know. This works for gpt-3.5.  gpt-4 could be different.
        // Complete stab in the dark here -- update if you know where all the extra tokens really come from.
        return count + 3 // Always seems to be message counts + 3
    }
  }

  export const countMessageTokens = (message:Message, model:Model, settings: ChatSettings):number => {
    const detail = getModelDetail(model)
    switch (detail.type) {
      case 'PetalsV2Websocket':
        return countTokens(model, getRoleTag(message.role, model, settings) + ': ' + message.content)
      case 'OpenAIChat':
      default:
        // Not sure how OpenAI formats it, but this seems to get close to the right counts.
        // Would be nice to know. This works for gpt-3.5.  gpt-4 could be different.
        // Complete stab in the dark here -- update if you know where all the extra tokens really come from.
        return countTokens(model, '## ' + message.role + ' ##:\r\n\r\n' + message.content + '\r\n\r\n\r\n')
    }
  }

  export const getModelMaxTokens = (model:Model):number => {
    return getModelDetail(model).max
  }

</script>