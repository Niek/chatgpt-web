<script lang="ts">
  import { params, replace } from 'svelte-spa-router'

  import { apiKeyStorage, chatsStorage, clearChats, deleteChat, addChatFromJSON } from './Storage.svelte'
  import { exportAsMarkdown, exportChatAsJSON } from './Export.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faSquarePlus, faTrash, faKey, faDownload, faUpload, faFileExport } from '@fortawesome/free-solid-svg-icons/index'

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)

  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined

  function delChat (chatId) {
    if (activeChatId === chatId) {
    // Find the max chatId other than the current one
      const newChatId = sortedChats.reduce((maxId, chat) => {
        if (chat.id === chatId) return maxId
        return Math.max(maxId, chat.id)
      }, 0)

      if (!newChatId) {
        // No other chats, clear all and go to home
        replace('/').then(() => { deleteChat(chatId) })
      } else {
        // Delete the current chat and go to the max chatId
        replace(`/chat/${newChatId}`).then(() => { deleteChat(chatId) })
      }
    } else {
      deleteChat(chatId)
    }
  }

  let fileinput

  const onFileSelected = (e) => {
    const image = e.target.files[0]
    const reader = new FileReader()
    reader.readAsText(image)
    reader.onload = e => {
      const json = (e.target || {}).result as string
      addChatFromJSON(json)
    }
  }
</script>

<aside class="menu">
  <p class="menu-label">Chats</p>
  <ul class="menu-list">
    {#if sortedChats.length === 0}
      <li><a href={'#'} class="is-disabled">No chats yet...</a></li>
    {:else}
      <!-- <li>
        <ul> -->
          {#each sortedChats as chat}
            <li>
              <a class="chat-menu-item" href={`#/chat/${chat.id}`} class:is-disabled={!$apiKeyStorage} class:is-active={activeChatId === chat.id}>
                <a class="is-pulled-right is-hidden px-1 py-0 greyscale has-text-weight-bold delete-button" href={'$'} on:click|preventDefault={() => delChat(chat.id)}><Fa icon={faTrash} /></a>
                <span>{chat.name || `Chat ${chat.id}`}</span>
              </a>
            </li>
          {/each}
        <!-- </ul>
      </li> -->
    {/if}
  </ul>
  <p class="menu-label">Actions</p>
  <ul class="menu-list">
    <li>
      <a href={'#/'} class="panel-block" class:is-disabled={!$apiKeyStorage} class:is-active={!activeChatId}
        ><span class="greyscale mr-2"><Fa icon={faKey} /></span> API key</a
      >
    </li>
    <li>
      <a href={'#/chat/new'} class="panel-block" class:is-disabled={!$apiKeyStorage}
        ><span class="greyscale mr-2"><Fa icon={faSquarePlus} /></span> New chat</a
      >
    </li>
    <li>
      <a class="panel-block"
        href="{'#/'}"
        class:is-disabled={!$apiKeyStorage}
        on:click|preventDefault={() => {
          const confirmDelete = window.confirm('Are you sure you want to delete all your chats?')
          if (confirmDelete) {
            replace('#/').then(() => clearChats())
          }
        }}><span class="greyscale mr-2"><Fa icon={faTrash} /></span> Clear chats</a
      >
    </li>
    {#if activeChatId}
      <li>
        <a
          href={'#/'}
          class="panel-block"
          class:is-disabled={!apiKeyStorage}
          on:click|preventDefault={() => {
            if (activeChatId) {
              exportAsMarkdown(activeChatId)
            }
          }}><span class="greyscale mr-2"><Fa icon={faFileExport} /></span> Export chat</a
        >
      </li>
      <li>
        <a
          href={'#/'}
          class="panel-block"
          class:is-disabled={!apiKeyStorage}
          on:click|preventDefault={() => {
            if (activeChatId) {
              exportChatAsJSON(activeChatId)
            }
          }}><span class="greyscale mr-2"><Fa icon={faDownload} /></span> Save chat</a
        >
      </li>
        
    {/if}
    <li>
      <a
        href={'#/'}
        class="panel-block"
        class:is-disabled={!apiKeyStorage}
        on:click|preventDefault={() => { fileinput.click() }}><span class="greyscale mr-2"><Fa icon={faUpload} /></span> Load chat</a
      >
      <input style="display:none" type="file" accept=".json" on:change={(e) => onFileSelected(e)} bind:this={fileinput} >
    </li>
  </ul>
</aside>

<style>
  .chat-menu-item {
    position: relative;
  }
  .chat-menu-item span {
    display: block;
    white-space:nowrap;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0));
    mask-image: linear-gradient(to right, rgba(0,0,0,1) 75%, rgba(0,0,0,0));
  }
  .chat-menu-item .delete-button {
    position: absolute;
    right: .4em;
    z-index: 200;
  }
</style>