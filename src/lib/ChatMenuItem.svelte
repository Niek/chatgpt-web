<script lang="ts">
  import { replace } from 'svelte-spa-router'
  import type { Chat } from './Types.svelte'
  import { deleteChat, pinMainMenu, saveChatStore } from './Storage.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faTrash, faCircleCheck, faPencil } from '@fortawesome/free-solid-svg-icons/index'
  import { faMessage } from '@fortawesome/free-regular-svg-icons/index'
  import { onMount } from 'svelte'
  import { hasActiveModels } from './Models.svelte'

  export let chat:Chat
  export let activeChatId:number|undefined
  export let prevChat:Chat|undefined
  export let nextChat:Chat|undefined

  let editing:boolean = false
  let original:string

  let waitingForConfirm:any = 0

  onMount(async () => {
    if (!chat.name) {
      chat.name = `Chat ${chat.id}`
    }
  })

  const keydown = (event:KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      event.preventDefault()
      chat.name = original
      editing = false
    }
    if (event.key === 'Tab' || event.key === 'Enter') {
      event.stopPropagation()
      event.preventDefault()
      update()
    }
  }

  const update = () => {
    editing = false
    if (!chat.name) {
      chat.name = original
      return
    }
    saveChatStore()
  }

  const delChat = () => {
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

  const edit = () => {
    original = chat.name
    editing = true
    setTimeout(() => {
      const el = document.getElementById(`chat-menu-item-${chat.id}`)
      el && el.focus()
    }, 0)
  }

</script>

<li>
  {#if editing}
    <div id="chat-menu-item-{chat.id}" class="chat-name-editor" on:keydown={keydown} contenteditable bind:innerText={chat.name} on:blur={update} />
  {:else}
  <a 
    href={`#/chat/${chat.id}`}
    class="chat-menu-item"
    class:is-waiting={waitingForConfirm} class:is-disabled={!hasActiveModels()} class:is-active={activeChatId === chat.id}
    on:click={() => { $pinMainMenu = false }} >
    {#if waitingForConfirm}
    <a class="is-pulled-right is-hidden px-1 py-0 has-text-weight-bold delete-button" href={'$'} on:click|preventDefault={() => delChat()}><Fa icon={faCircleCheck} /></a>
    {:else}
    <a class="is-pulled-right is-hidden px-1 py-0 has-text-weight-bold edit-button" href={'$'} on:click|preventDefault={() => edit()}><Fa icon={faPencil} /></a>
    <a class="is-pulled-right is-hidden px-1 py-0 has-text-weight-bold delete-button" href={'$'} on:click|preventDefault={() => delChat()}><Fa icon={faTrash} /></a>
    {/if}
    <span class="chat-item-name"><Fa class="mr-2 chat-icon" size="xs" icon="{faMessage}"/>{chat.name || `Chat ${chat.id}`}</span>
  </a>
  {/if}
</li>