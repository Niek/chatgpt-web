<script lang="ts">
  // Iterate messages
  import type { Message, Chat } from './Types.svelte'
  import { chatsStorage } from './Storage.svelte'
  import EditMessage from './EditMessage.svelte'

  export let messages : Message[]
  export let chatId
  
  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: chatSettings = chat.settings

</script>

{#each messages as message, i}
  {#if !(i === 0 && message.role === 'system' && !chatSettings.useSystemPrompt)}
  <EditMessage bind:message={message} chatId={chatId} />
  {/if}
{/each}
