<script lang="ts">
    import Code from './Code.svelte'
    import SvelteMarkdown from 'svelte-markdown'
    import type { Message, Model, Usage } from './Types.svelte'

    import {marked} from "marked";
    import markedKatex from "marked-katex-extension";
    import '../katex.min.css';

    // whether to render latex; default is true
    const renderLatexFlag = JSON.parse(import.meta.env.VITE_RENDER_LATEX) || false

    // Marked options
    const markedownOptions = {
      gfm: true, // Use GitHub Flavored Markdown
      breaks: true, // Enable line breaks in markdown
      mangle: false // Do not mangle email addresses
    }

    // Katex rendering
    const renderLatex = (text: string): string => {
        if (renderLatexFlag === true) {
        const katexOptions = { throwOnError: false };
        marked.use(markedKatex(katexOptions));
        return marked(text);
        }

        return text;
    };

    const renderersLatex = {
        code: Code,
        ...(renderLatexFlag ? {} : { html: Code })
    };

    export let messages : Message[]
    export let input: HTMLTextAreaElement
    export let defaultModel: Model

    // Reference: https://openai.com/pricing#language-models
    const tokenPrice : Record<string, [number, number]> = {
      'gpt-4-32k': [0.00006, 0.00012], // $0.06 per 1000 tokens prompt, $0.12 per 1000 tokens completion
      'gpt-4': [0.00003, 0.00006], // $0.03 per 1000 tokens prompt, $0.06 per 1000 tokens completion
      'gpt-3.5': [0.000002, 0.000002] // $0.002 per 1000 tokens (both prompt and completion)
    }

    const getPrice = (tokens: Usage, model: Model): number => {
      for (const [key, [promptPrice, completionPrice]] of Object.entries(tokenPrice)) {
        if (model.startsWith(key)) {
          return ((tokens.prompt_tokens * promptPrice) + (tokens.completion_tokens * completionPrice))
        }
      }

      return 0
    }
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
  {:else if message.role === 'system' || message.role === 'error'}
    <article class="message is-danger assistant-message">
      <div class="message-body content">
        <SvelteMarkdown source={message.content} options={markedownOptions} renderers={{ code: Code, html: Code }}/>
      </div>
    </article>
  {:else}
    <article class="message is-success assistant-message">
      <div class="message-body content">
        <SvelteMarkdown source={renderLatex(message.content)} options={markedownOptions} renderers={renderersLatex}/>
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