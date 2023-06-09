<script lang="ts">
  // Iterate messages
  import type { Message, Chat } from './Types.svelte'
  import { chatsStorage, globalStorage } from './Storage.svelte'
  import EditMessage from './EditMessage.svelte'

  export let messages : Message[]
  export let chatId: number
  
  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: chatSettings = chat.settings

</script>

{#each messages as message, i}
  {#if !((message.summarized) && $globalStorage.hideSummarized) && !(i === 0 && message.role === 'system' && !chatSettings.useSystemPrompt)}
  {#key message.uuid}<EditMessage bind:message={message} chatId={chatId} />{/key}
  {/if}
{/each}
