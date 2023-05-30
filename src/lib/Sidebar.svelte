<script lang="ts">
  import { params } from 'svelte-spa-router'
  import ChatMenuItem from './ChatMenuItem.svelte'
  import { apiKeyStorage, chatsStorage } from './Storage.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faSquarePlus, faKey } from '@fortawesome/free-solid-svg-icons/index'

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)

  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined
  
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
  </ul>
</aside>
