<script lang="ts">
    import Code from './Code.svelte'
    import SvelteMarkdown from 'svelte-markdown'
    import type { Message, Model, Usage } from './Types.svelte'
    import { getPrice, convertToUsage, findSublists } from './TokenUtil.svelte'


    // Marked options
    const markedownOptions = {
      gfm: true, // Use GitHub Flavored Markdown
      breaks: true, // Enable line breaks in markdown
      mangle: false // Do not mangle email addresses
    }

    export let messages : Message[]
    export let input: HTMLTextAreaElement
    export let defaultModel: Model


let usage: Usage
let combinedUse: Usage
const model: String | undefined = messages.length > 0 ? messages[messages.length - 1].model : undefined
$: combinedUse = messages && messages.filter((item) => item.role === 'assistant').length > 0
  ? findSublists(messages, (item) => item.role === 'assistant').map((msgs) => convertToUsage(messages, model))
        .reduce((acc, curr) => {
          return {
            completion_tokens: acc.completion_tokens + curr.completion_tokens,
            prompt_tokens: acc.prompt_tokens + curr.prompt_tokens,
            total_tokens: acc.total_tokens + curr.total_tokens
          }
        }, { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 })
      : { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0 }
$: usage = convertToUsage(messages, model)
</script>

{#each messages as message}
  {#if message.role === 'user'}
    <article
      class="message is-info user-message"
      class:has-text-right={message.content.split('\n').filter((line) => line.trim()).length === 1}
    >
      <div class="message-body content">
        <a
          href={'#'}
          class="greyscale is-pulled-right ml-2 is-hidden editbutton"
          on:click={() => {
            input.value = message.content
            input.focus()
          }}
        >
          ✏️
        </a>
        <SvelteMarkdown source={message.content} options={markedownOptions} renderers={{ code: Code, html: Code }}/>
      </div>
    </article>
  {:else if message.role === 'system'}
    <article class="message is-warning user-message">
      <div class="message-body content">
        <SvelteMarkdown source={message.content} options={markedownOptions} renderers={{ code: Code, html: Code }}/>
      </div>
    </article>
  {:else if message.role === 'error'}
    <article class="message is-danger assistant-message">
      <div class="message-body content">
        <SvelteMarkdown source={message.content} options={markedownOptions} renderers={{ code: Code, html: Code }}/>
      </div>
    </article>
  {:else}
    <article class="message is-success assistant-message">
      <div class="message-body content">
        <SvelteMarkdown source={message.content} options={markedownOptions} renderers={{ code: Code, html: Code }}/>
        {#if message.usage}
          <p class="is-size-7">
            This message was generated on <em>{message.model || defaultModel}</em> using <span class="has-text-weight-bold">{message.usage.total_tokens}</span>
            tokens ~= <span class="has-text-weight-bold">${getPrice(message.usage, message.model || defaultModel).toFixed(6)}</span>
          </p>
        {/if}
      </div>
    </article>
    {/if}
  {/each}
  {#if messages.length > 0}
  <p class="is-size-7">
    The complete chat is currently using <span class="has-text-weight-bold">
      {usage.total_tokens.toLocaleString()} total tokens</span>
    adding ~= <span class="has-text-weight-bold">
      ${getPrice({ prompt_tokens: usage.total_tokens, completion_tokens: 0 }, messages[0]?.model || defaultModel).toFixed(6)}
    </span>
    to the next prompt
  </p>
  <div class="is-size-7">In all the currently visible messages amount to 
    {combinedUse.prompt_tokens?.toLocaleString() || '0'} prompt tokens, 
    {combinedUse.completion_tokens?.toLocaleString() || '0'} completion tokens, 
    {combinedUse.total_tokens?.toLocaleString() || '0'} total tokens and  
    ~= <span class="has-text-weight-bold">
      ${(getPrice(combinedUse, messages[0]?.model || defaultModel) || 0.00000).toFixed(6) }
    </span>
    </div>
  {/if}