<script context="module" lang="ts">
  import { countTokens, getDeliminator, getLeadPrompt, getModelDetail, getRoleEnd, getRoleTag, getStartSequence } from './Models.svelte'
  import type { Chat, Message, Model, Usage } from './Types.svelte'

  export const getPrice = (tokens: Usage, model: Model): number => {
    const t = getModelDetail(model)
    return ((tokens.prompt_tokens * t.prompt) + (tokens.completion_tokens * t.completion))
  }

  export const countPromptTokens = (prompts:Message[], model:Model, chat: Chat):number => {
    const detail = getModelDetail(model)
    const count = prompts.reduce((a, m) => {
      a += countMessageTokens(m, model, chat)
      return a
    }, 0)
    switch (detail.type) {
      case 'Petals':
        return count + countTokens(model, getStartSequence(chat)) + countTokens(model, getLeadPrompt(chat))
      case 'OpenAIChat':
      default:
        // Not sure how OpenAI formats it, but this seems to get close to the right counts.
        // Would be nice to know. This works for gpt-3.5.  gpt-4 could be different.
        // Complete stab in the dark here -- update if you know where all the extra tokens really come from.
        return count + 3 // Always seems to be message counts + 3
    }
  }

  export const countMessageTokens = (message:Message, model:Model, chat: Chat):number => {
    const detail = getModelDetail(model)
    const delim = getDeliminator(chat)
    switch (detail.type) {
      case 'Petals':
        return countTokens(model, getRoleTag(message.role, model, chat) + ': ' +
        message.content + getRoleEnd(message.role, model, chat) + (delim || '###'))
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