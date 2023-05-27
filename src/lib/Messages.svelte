<script lang="ts">
  // Iterate messages
  import type { Message } from './Types.svelte'
  import { getChatSettingValueByKey } from './Storage.svelte'
  import EditMessage from './EditMessage.svelte'

  export let messages : Message[]
  export let chatId

</script>

{#each messages as message, i}
  {#if !(i === 0 && message.role === 'system' && !getChatSettingValueByKey(chatId, 'useSystemPrompt'))}
  <EditMessage bind:message={message} chatId={chatId} />
  {/if}
{/each}
