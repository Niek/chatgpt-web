<script lang="ts">
  import Fa from 'svelte-fa/src/fa.svelte'
  import {
    faGear,
    faTrash,
    faClone,
    faEllipsisVertical,
    faDownload,
    faUpload,
    faEraser,
    faRotateRight,
    faSquarePlus,
    faKey,
    faFileExport,
    faTrashCan
  } from '@fortawesome/free-solid-svg-icons/index'
  import { addChatFromJSON, chatsStorage, clearChats, clearMessages, copyChat, showSetChatSettings } from './Storage.svelte'
  import { exportAsMarkdown, exportChatAsJSON } from './Export.svelte'
  import { applyProfile } from './Profiles.svelte'
  import { replace } from 'svelte-spa-router'
  import { clickOutside } from 'svelte-use-click-outside'

  export let chatId
  export const show = () => {
    showChatMenu = true
  }

  let showChatMenu = false
  let chatFileInput

  const importChatFromFile = (e) => {
    const image = e.target.files[0]
    const reader = new FileReader()
    reader.readAsText(image)
    reader.onload = e => {
      const json = (e.target || {}).result as string
      addChatFromJSON(json)
    }
  }

  const deleteChat = () => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      replace('/').then(() => {
        chatsStorage.update((chats) => chats.filter((chat) => chat.id !== chatId))
      })
    }
  }

  const confirmClearChats = () => {
    if (window.confirm('Are you sure you want to delete ALL of your chats?')) {
      clearChats()
    }
  }

</script>

<div class="dropdown is-right" class:is-active={showChatMenu} use:clickOutside={() => { showChatMenu = false }}>
  <div class="dropdown-trigger">
    <button class="button" aria-haspopup="true" 
      aria-controls="dropdown-menu3" 
      on:click|preventDefault|stopPropagation={() => { showChatMenu = !showChatMenu }}
      >
      <span><Fa icon={faEllipsisVertical}/></span>
    </button>
  </div>
  <div class="dropdown-menu" id="dropdown-menu3" role="menu">
    <div class="dropdown-content">
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) showChatMenu = false; $showSetChatSettings = true }}>
        <span class="menu-icon"><Fa icon={faGear}/></span> Chat Profile Settings
      </a>
      <hr class="dropdown-divider">
      <a href={'#/chat/new'} class="dropdown-item">
        <span class="menu-icon"><Fa icon={faSquarePlus}/></span> New Chat
      </a>
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) showChatMenu = false; copyChat(chatId) }}>
        <span class="menu-icon"><Fa icon={faClone}/></span> Clone Chat
      </a>
      <hr class="dropdown-divider">
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { showChatMenu = false; exportChatAsJSON(chatId) }}>
        <span class="menu-icon"><Fa icon={faDownload}/></span> Save Chat JSON
      </a>
      <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { if (chatId) showChatMenu = false; chatFileInput.click() }}>
        <span class="menu-icon"><Fa icon={faUpload}/></span> Restore Chat JSON
      </a>
      <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { if (chatId) showChatMenu = false; exportAsMarkdown(chatId) }}>
        <span class="menu-icon"><Fa icon={faFileExport}/></span> Export Chat Markdown
      </a>
      <hr class="dropdown-divider">
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) applyProfile(chatId, '', true) /* closeSettings() */ }}>
        <span class="menu-icon"><Fa icon={faRotateRight}/></span> Restart Chat Session
      </a>
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) showChatMenu = false; clearMessages(chatId) }}>
        <span class="menu-icon"><Fa icon={faEraser}/></span> Clear Chat Messages
      </a>
      <hr class="dropdown-divider">
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) showChatMenu = false; deleteChat() }}>
        <span class="menu-icon"><Fa icon={faTrash}/></span> Delete Chat
      </a>
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) showChatMenu = false; confirmClearChats() }}>
        <span class="menu-icon"><Fa icon={faTrashCan}/></span> Delete ALL Chats
      </a>
      <hr class="dropdown-divider">
      <a href={'#/'} class="dropdown-item">
        <span><Fa icon={faKey}/></span> API Key
      </a>
    </div>
  </div>
</div>

<input style="display:none" type="file" accept=".json" on:change={(e) => importChatFromFile(e)} bind:this={chatFileInput} >

<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') {
      showChatMenu = false
    }
  }}
/>
