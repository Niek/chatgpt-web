<script lang="ts">
    import {params, replace} from 'svelte-spa-router'

    import {apiKeyStorage, chatsStorage, clearChats, deleteChat} from './Storage.svelte'
    import {exportAsMarkdown} from './Export.svelte'
    import _ from 'lodash'
    $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)

    $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined

    function delChat (chatId) {
      if (activeChatId === chatId) {
        // switch to another chat if deleting the active one
        const newChatId = _.maxBy($chatsStorage.filter(chat => chat.id !== chatId), 'id')?.id
        if (!newChatId) return
        replace(`/chat/:${newChatId}`).then(() => deleteChat(chatId))
      } else {
        deleteChat(chatId)
      }
    }

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
                            <a style="position: relative" href={`#/chat/${chat.id}`} class:is-disabled={!$apiKeyStorage} class:is-active={activeChatId === chat.id}
                            >{chat.name || `Chat ${chat.id}`}
                                <svg on:click={() => delChat(chat.id)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="delete-btn">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </a
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
               on:click|preventDefault={() => {
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
