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
    faTrashCan,
    faEye,
    faEyeSlash
  } from '@fortawesome/free-solid-svg-icons/index'
  import { addChatFromJSON, chatsStorage, checkStateChange, clearChats, clearMessages, copyChat, globalStorage, setGlobalSettingValueByKey, showSetChatSettings } from './Storage.svelte'
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
    close()
    const image = e.target.files[0]
    const reader = new FileReader()
    reader.readAsText(image)
    reader.onload = e => {
      const json = (e.target || {}).result as string
      addChatFromJSON(json)
    }
  }

  const deleteChat = () => {
    close()
    if (window.confirm('Are you sure you want to delete this chat?')) {
      replace('/').then(() => {
        chatsStorage.update((chats) => chats.filter((chat) => chat.id !== chatId))
      })
    }
  }

  const confirmClearChats = () => {
    close()
    if (window.confirm('Are you sure you want to delete ALL of your chats?')) {
      clearChats()
    }
  }

  const close = () => {
    showChatMenu = false
  }

  const restartChatSession = () => {
    close()
    applyProfile(chatId, '', true)
    $checkStateChange++ // signal chat page to start profile
  }

  const toggleHideSummarized = () => {
    close()
    setGlobalSettingValueByKey('hideSummarized', !$globalStorage.hideSummarized)
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
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) close(); $showSetChatSettings = true }}>
        <span class="menu-icon"><Fa icon={faGear}/></span> Chat Profile Settings
      </a>
      <hr class="dropdown-divider">
      <a href={'#/chat/new'} class="dropdown-item">
        <span class="menu-icon"><Fa icon={faSquarePlus}/></span> New Chat
      </a>
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) close(); copyChat(chatId) }}>
        <span class="menu-icon"><Fa icon={faClone}/></span> Clone Chat
      </a>
      <hr class="dropdown-divider">
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) restartChatSession() }}>
        <span class="menu-icon"><Fa icon={faRotateRight}/></span> Restart Chat Session
      </a>
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) close(); clearMessages(chatId) }}>
        <span class="menu-icon"><Fa icon={faEraser}/></span> Clear Chat Messages
      </a>
      <hr class="dropdown-divider">
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { close(); exportChatAsJSON(chatId) }}>
        <span class="menu-icon"><Fa icon={faDownload}/></span> Backup Chat JSON
      </a>
      <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { if (chatId) close(); chatFileInput.click() }}>
        <span class="menu-icon"><Fa icon={faUpload}/></span> Restore Chat JSON
      </a>
      <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { if (chatId) close(); exportAsMarkdown(chatId) }}>
        <span class="menu-icon"><Fa icon={faFileExport}/></span> Export Chat Markdown
      </a>
      <hr class="dropdown-divider">
      <a href={'#'} class="dropdown-item" class:is-disabled={!chatId} on:click|preventDefault={() => { if (chatId) close(); deleteChat() }}>
        <span class="menu-icon"><Fa icon={faTrash}/></span> Delete Chat
      </a>
      <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { if (chatId) confirmClearChats() }}>
        <span class="menu-icon"><Fa icon={faTrashCan}/></span> Delete ALL Chats
      </a>
      <hr class="dropdown-divider">
      <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { if (chatId) toggleHideSummarized() }}>
        {#if $globalStorage.hideSummarized}
        <span class="menu-icon"><Fa icon={faEye}/></span> Show Summarized Messages
        {:else}
        <span class="menu-icon"><Fa icon={faEyeSlash}/></span> Hide Summarized Messages
        {/if}
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
