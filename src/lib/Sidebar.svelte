<script lang="ts">
  import { params } from 'svelte-spa-router'
  import ChatMenuItem from './ChatMenuItem.svelte'
  import { apiKeyStorage, chatsStorage, pinMainMenu } from './Storage.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faSquarePlus, faKey } from '@fortawesome/free-solid-svg-icons/index'
  import ChatOptionMenu from './ChatOptionMenu.svelte'
  import logo from '../assets/logo.svg'
  import { clickOutside } from 'svelte-use-click-outside'

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)

  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined
  
</script>

<aside class="menu main-menu" class:pinned={$pinMainMenu} use:clickOutside={() => { $pinMainMenu = false }}>
  <div class="menu-expanse">
      <div class="gpt-logo navbar-brand">
        <a class="navbar-item" href={'#/'}>
          <img src={logo} alt="ChatGPT-web" width="24" height="24" />
          <p class="ml-2 is-size-5 has-text-weight-bold">ChatGPT-web</p>
        </a>
      </div>
    <ul class="menu-list menu-expansion-list">
      {#if sortedChats.length === 0}
        <li><a href={'#'} class="is-disabled">No chats yet...</a></li>
      {:else}
        {#each sortedChats as chat, i}
        <ChatMenuItem activeChatId={activeChatId} chat={chat} prevChat={sortedChats[i - 1]} nextChat={sortedChats[i + 1]} />
        {/each}
      {/if}
    </ul>
    <!-- <p class="menu-label">Actions</p> -->
    <ul class="menu-list">
      <li>
        <div class="level-right side-actions">
          {#if !$apiKeyStorage}
          <div class="level-item">
            <a href={'#/'} class="panel-block" class:is-disabled={!$apiKeyStorage}
              ><span class="greyscale mr-2"><Fa icon={faKey} /></span> API key</a
            ></div>
          {:else}
          <div class="level-item">
            <a href={'#/chat/new'} class="panel-block" class:is-disabled={!$apiKeyStorage}
              ><span class="greyscale mr-2"><Fa icon={faSquarePlus} /></span> New chat</a
            ></div>
          {/if}
          <div class="level-item">
            <ChatOptionMenu bind:chatId={activeChatId} style="is-right is-up" />
          </div>
        </div>
      </li>
    </ul>
  </div>
</aside>
