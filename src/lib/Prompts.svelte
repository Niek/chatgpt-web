<script lang="ts">
  import DOMPurify from 'dompurify'
  import Typeahead from 'svelte-typeahead'
  import prompts from '../awesome-chatgpt-prompts/prompts.csv'

  const inputPrompt = (prompt: string) => {
    input.value = prompt
    input.style.height = 'auto'
    input.style.height = input.scrollHeight + 'px'
  }

  const extract = (prompt: typeof prompts[0]) => prompt.act

  export let input : HTMLTextAreaElement
</script>

{#if input}
<div class="columns is-centered">
  <div class="column is-half">
    <Typeahead
      data={prompts}
      {extract}
      label="Select a pre-made prompt"
      hideLabel
      showDropdownOnFocus
      showAllResultsOnFocus
      inputAfterSelect="clear"
      on:select={({ detail }) => inputPrompt(detail.original.prompt)}
      placeholder="Select a pre-made prompt 👇"
      let:result
    >
      <a class="dropdown-item" href="#top" on:click|preventDefault title="{result.original.prompt}">
        <!--
          Sanitize result.string because Typeahead introduces HTML tags and prompt
          strings are untrusted.
        -->
        {@html DOMPurify.sanitize(result.string, { ALLOWED_TAGS: ['mark'] })}
      </a>
    </Typeahead>
  </div>
</div>

<div class="columns is-centered">
  <div class="column is-half has-text-centered">or type below:</div>
</div>
{/if}