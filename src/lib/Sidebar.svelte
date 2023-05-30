<script lang="ts">
  import { params } from 'svelte-spa-router'
  import ChatMenuItem from './ChatMenuItem.svelte'
  import { apiKeyStorage, chatsStorage } from './Storage.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faSquarePlus, faKey } from '@fortawesome/free-solid-svg-icons/index'

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)

  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined
  
  // let fileinput

  // const onFileSelected = (e) => {
  //   const image = e.target.files[0]
  //   const reader = new FileReader()
  //   reader.readAsText(image)
  //   reader.onload = e => {
  //     const json = (e.target || {}).result as string
  //     addChatFromJSON(json)
  //   }
  // }
</script>

<aside class="menu">
  <p class="menu-label">Chats</p>
  <ul class="menu-list">
    {#if sortedChats.length === 0}
      <li><a href={'#'} class="is-disabled">No chats yet...</a></li>
    {:else}
      {#each sortedChats as chat, i}
      <ChatMenuItem activeChatId={activeChatId} chat={chat} prevChat={sortedChats[i - 1]} nextChat={sortedChats[i + 1]} />
      {/each}
    {/if}
  </ul>
  <p class="menu-label">Actions</p>
  <ul class="menu-list">
    {#if !$apiKeyStorage}
    <li>
      <a href={'#/'} class="panel-block" class:is-disabled={!$apiKeyStorage} class:is-active={!activeChatId}
        ><span class="greyscale mr-2"><Fa icon={faKey} /></span> API key</a
      >
    </li>
    {:else}
    <li>
      <a href={'#/chat/new'} class="panel-block" class:is-disabled={!$apiKeyStorage}
        ><span class="greyscale mr-2"><Fa icon={faSquarePlus} /></span> New chat</a
      >
    </li>
    {/if}
    <!-- <li>
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
        
    {/if} -->
    <!-- <li>
      <a
        href={'#/'}
        class="panel-block"
        class:is-disabled={!apiKeyStorage}
        on:click|preventDefault={() => { fileinput.click() }}><span class="greyscale mr-2"><Fa icon={faUpload} /></span> Load chat</a
      >
      <input style="display:none" type="file" accept=".json" on:change={(e) => onFileSelected(e)} bind:this={fileinput} >
    </li> -->
  </ul>
</aside>
