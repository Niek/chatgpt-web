<script lang="ts">
  import { replace } from 'svelte-spa-router'
  import type { Chat } from './Types.svelte'
  import { apiKeyStorage, deleteChat } from './Storage.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faTrash, faCircleCheck } from '@fortawesome/free-solid-svg-icons/index'

  export let chat:Chat
  export let activeChatId:number|undefined
  export let prevChat:Chat|undefined
  export let nextChat:Chat|undefined

  let waitingForConfirm:any = 0

  function delChat () {
    if (!waitingForConfirm) {
      // wait a second for another click to avoid accidental deletes
      waitingForConfirm = setTimeout(() => { waitingForConfirm = 0 }, 1000)
      return
    }
    clearTimeout(waitingForConfirm)
    waitingForConfirm = 0
    if (activeChatId === chat.id) {
      const newChat = nextChat || prevChat
      if (!newChat) {
        // No other chats, clear all and go to home
        replace('/').then(() => { deleteChat(chat.id) })
      } else {
        // Delete the current chat and go to the max chatId
        replace(`/chat/${newChat.id}`).then(() => { deleteChat(chat.id) })
      }
    } else {
      deleteChat(chat.id)
    }
  }

</script>

<li>
  <a class="chat-menu-item" href={`#/chat/${chat.id}`} class:is-waiting={waitingForConfirm} class:is-disabled={!$apiKeyStorage} class:is-active={activeChatId === chat.id}>
    {#if waitingForConfirm}
    <a class="is-pulled-right is-hidden px-1 py-0 greyscale has-text-weight-bold delete-button" href={'$'} on:click|preventDefault={() => delChat()}><Fa icon={faCircleCheck} /></a>
    {:else}
    <a class="is-pulled-right is-hidden px-1 py-0 greyscale has-text-weight-bold delete-button" href={'$'} on:click|preventDefault={() => delChat()}><Fa icon={faTrash} /></a>
    {/if}
    <span>{chat.name || `Chat ${chat.id}`}</span>
  </a>
</li>