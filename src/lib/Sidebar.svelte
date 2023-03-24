<script lang="ts">
  import { params, replace } from 'svelte-spa-router'

  import { apiKeyStorage, chatsStorage, clearChats } from './Storage.svelte'
  import { exportAsMarkdown } from './Export.svelte'

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)

  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined
</script>

<aside class="menu">
  <p class="menu-label">Chats</p>
  <ul class="menu-list">
    {#if sortedChats.length === 0}
      <li><a href={'#'} class="is-disabled">No chats yet...</a></li>
    {:else}
      <li>
        <ul>
          {#each sortedChats as chat}
            <li>
              <a href={`#/chat/${chat.id}`} class:is-disabled={!$apiKeyStorage} class:is-active={activeChatId === chat.id}
                >{chat.name || `Chat ${chat.id}`}</a
              >
            </li>
          {/each}
        </ul>
      </li>
    {/if}
  </ul>
  <p class="menu-label">Actions</p>
  <ul class="menu-list">
    <li>
      <a href={'#/'} class="panel-block" class:is-disabled={!$apiKeyStorage} class:is-active={!activeChatId}
        ><span class="greyscale mr-2">🔑</span> API key</a
      >
    </li>
    <li>
      <a href={'#/chat/new'} class="panel-block" class:is-disabled={!$apiKeyStorage}
        ><span class="greyscale mr-2">➕</span> New chat</a
      >
    </li>
    <li>
      <a class="panel-block"
        href="{'#/'}"
        class:is-disabled={!$apiKeyStorage}
        on:click={() => {
          const confirmDelete = window.confirm('Are you sure you want to delete all your chats?')
          if (confirmDelete) {
            replace('#/').then(() => clearChats())
          }
        }}><span class="greyscale mr-2">🗑️</span> Clear chats</a
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
          }}><span class="greyscale mr-2">📥</span> Export chat</a
        >
      </li>
    {/if}
  </ul>
</aside>
