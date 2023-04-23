<script context="module" lang="ts">
  import type { Message, Model, Usage } from './Types.svelte'
  import GPT3Tokenizer from 'gpt3-tokenizer'

  const tokenizer = new GPT3Tokenizer({ type: 'gpt3' })

  // Reference: https://openai.com/pricing#language-models
  const tokenPrice : Record<string, [number, number]> = {
    'gpt-4-32k': [0.00006, 0.00012], // $0.06 per 1000 tokens prompt, $0.12 per 1000 tokens completion
    'gpt-4': [0.00003, 0.00006], // $0.03 per 1000 tokens prompt, $0.06 per 1000 tokens completion
    'gpt-3.5': [0.000002, 0.000002] // $0.002 per 1000 tokens (both prompt and completion)
  }

  export function getPrice (tokens: Usage, model: Model): number {
    for (const [key, [promptPrice, completionPrice]] of Object.entries(tokenPrice)) {
      if (model.startsWith(key)) {
        return ((tokens.prompt_tokens * promptPrice) + (tokens.completion_tokens * completionPrice))
      }
    }

    return 0
  }

  export function convertToUsage (msgs: Message[], model?: Model): Usage {
    const completion_tokens = numTokensFromMessages((msgs.filter(msg => msg.role === 'assistant')), model)
    const total_tokens = numTokensFromMessages(msgs, model)
    const prompt_tokens = total_tokens - completion_tokens
    return {
      completion_tokens,
      prompt_tokens,
      total_tokens
    } as Usage
  }


  /**
  Calculates the number of tokens for a given array of messages using the specified language model.
  @param messages An array of messages in the format { [key: string]: string }[], where each message contains keys for "role" and "content" (and optionally "name").
  @param model (optional) The language model to use. Defaults to 'gpt-3.5-turbo-0301'. Possible values are 'gpt-3.5-turbo-0301', 'gpt-4', and 'gpt-4-0314'.
  @returns The total number of tokens.
  @throws An error is thrown when an unsupported model is provided.
  @example
  const messages = [
  { role: "user", content: "Hi!" },
  { role: "assistant", content: "Hello there!" },
  { role: "user", content: "How are you doing?" },
  { role: "assistant", content: "I'm doing well, thank you." }
  ];
  const numTokens = numTokensFromMessages(messages, 'gpt-3.5-turbo-0301');
  console.log(numTokens); // Output: 52
  */
  export function numTokensFromMessages (messages: { [key: string]: string }[], model: Model = 'gpt-3.5-turbo-0301'): number {
    let tokensPerMessage = 0 // every message follows <|start|>{role/name}\n{content}<|end|>\n
    let tokensPerName = 0 // if there's a name, the role is omitted
    if (model === 'gpt-3.5-turbo') {
      console.warn('Warning: gpt-3.5-turbo may change over time. Returning num tokens assuming gpt-3.5-turbo-0301.')
      return numTokensFromMessages(messages, model = 'gpt-3.5-turbo-0301')
    } else if (model === 'gpt-4') {
      console.warn('Warning: gpt-4 may change over time. Returning num tokens assuming gpt-4-0314.')
      return numTokensFromMessages(messages, model = 'gpt-4-0314')
    } else if (model === 'gpt-3.5-turbo-0301') {
      tokensPerMessage = 4 // every message follows <|start|>{role/name}\n{content}<|end|>\n
      tokensPerName = -1 // if there's a name, the role is omitted
    } else if (model === 'gpt-4-0314') {
      tokensPerMessage = 3
      tokensPerName = 1
    } else {
      throw new Error(`numTokensFromMessages() is not implemented for model ${model}. See https://github.com/openai/openai-python/blob/main/chatml.md for information on how messages are converted to tokens.`)
    }
    let numTokens = 0
    for (const message of messages) {
      numTokens += tokensPerMessage
      for (const [key, value] of Object.entries(message)) {
        if (typeof value !== 'string') {
          continue // skip over non-string values
        }
        numTokens += tokenizer.encode(value).bpe.length
        if (key === 'name') {
          numTokens += tokensPerName
        }
      }
    }
    numTokens += 3 // every reply is primed with <|start|>assistant<|message|>
    return numTokens
  }
  

  /**
 * Returns a list of sublists from the input list where each sublist starts with an item that satisfies the given predicate.
 * For calculating the sum cost of the whole chat, as for each completion request only the last response consumes completion tokens
 * @param list The input list to search for sublists.
 * @param predicate A function that takes an item of type T and returns a boolean indicating whether the item should be the start of a new sublist.
 * @returns An array of sublists of type T[][] where each sublist starts with an item that satisfies the given predicate.
 */
  export function findSublists<T> (list: T[], predicate: (item: T) => boolean): T[][] {
    if (list?.length > 0) {
      const sublists:T[][] = []
      const currentSublist:T[] = []

      for (let i = 0; i < list.length; i++) {
        currentSublist.push(list[i])
        if (predicate(list[i])) {
          sublists.push([...currentSublist])
        }
      }

      return sublists
    }
  }
</script>