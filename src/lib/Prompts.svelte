<script lang="ts">
  import prompts from '../awesome-chatgpt-prompts/prompts.csv'

  const inputPrompt = (prompt: string) => {
    input.value = prompt
    input.style.height = 'auto'
    input.style.height = input.scrollHeight + 'px'
  }

  export let input : HTMLTextAreaElement
</script>

{#if input}
<div class="columns is-centered">
  <div class="column is-half">
    <div class="dropdown is-hoverable is-fullwidth">
      <div class="dropdown-trigger">
        <button class="button is-fullwidth" aria-haspopup="true" aria-controls="dropdown-menu">
          <span>Select a pre-made prompt</span>
          <span class="icon is-small">👇</span>
        </button>
      </div>
      <div class="dropdown-menu" id="dropdown-menu" role="menu">
        <div class="dropdown-content">
          {#each prompts as prompt}
            <a class="dropdown-item" href={'#'} on:click|preventDefault={() => inputPrompt(prompt.prompt)}>
              {prompt.act}
            </a>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<div class="columns is-centered">
  <div class="column is-half has-text-centered">or type below:</div>
</div>
{/if}