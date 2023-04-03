<script lang="ts">
  import prompts from '../awesome-chatgpt-prompts/prompts.csv'
  import { Dropdown, DropdownItem, Button, Chevron } from 'flowbite-svelte'

  const inputPrompt = (prompt: string) => {
    input.value = prompt
    input.style.height = 'auto'
    input.style.height = input.scrollHeight + 'px'
    active = false
  }

  export let input : HTMLTextAreaElement

  let active: boolean = false
</script>

{#if input}
<div class="mx-auto">
<Button color="dark"><Chevron>Select a pre-made prompt 👇</Chevron></Button>
<Dropdown >
  {#each prompts as prompt}
    <DropdownItem title="{prompt.prompt}" on:click={() => inputPrompt(prompt.prompt)}>{prompt.act}</DropdownItem>
  {/each}

</Dropdown>
  </div>
<div class="mx-auto">
  <div class="mt-2">or type below:</div>
</div>
{/if}