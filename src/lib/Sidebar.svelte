<script lang="ts">
  import { params } from 'svelte-spa-router'
  import ChatMenuItem from './ChatMenuItem.svelte'
  import { apiKeyStorage, chatsStorage, pinMainMenu, checkStateChange } from './Storage.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faSquarePlus, faKey } from '@fortawesome/free-solid-svg-icons/index'
  import ChatOptionMenu from './ChatOptionMenu.svelte'
  import logo from '../assets/logo.svg'
  import { clickOutside } from 'svelte-use-click-outside'
  import { startNewChatWithWarning } from './Util.svelte'

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)
  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined

</script>

<aside class="menu main-menu" class:pinned={$pinMainMenu} use:clickOutside={() => { $pinMainMenu = false }}>
  <div class="menu-expanse">
      <div class="navbar-brand menu-nav-bar">
        <a class="navbar-item gpt-logo" href={'#/'}>
          <img src={logo} alt="ChatGPT-web" width="24" height="24" />
          <p class="ml-2 is-size-5 has-text-weight-bold">ChatGPT-web</p>
        </a>
        <div class="chat-option-menu navbar-item is-pulled-right">
          <ChatOptionMenu bind:chatId={activeChatId} />
        </div>
      </div>
    <ul class="menu-list menu-expansion-list">
      {#if sortedChats.length === 0}
        <li><a href={'#'} class="is-disabled">No chats yet...</a></li>
      {:else}
        {#key $checkStateChange}
        {#each sortedChats as chat, i}
        <ChatMenuItem activeChatId={activeChatId} chat={chat} prevChat={sortedChats[i - 1]} nextChat={sortedChats[i + 1]} />
        {/each}
        {/key}
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
            <button on:click={() => { $pinMainMenu = false; startNewChatWithWarning(activeChatId) }} class="panel-block button" title="Start new chat with default profile" class:is-disabled={!$apiKeyStorage}
              ><span class="greyscale mr-2"><Fa icon={faSquarePlus} /></span> New chat</button>
            </div>
          {/if}
        </div>
      </li>
    </ul>
  </div>
</aside>
