<script lang="ts">
  import { params } from 'svelte-spa-router'
  import ChatMenuItem from './ChatMenuItem.svelte'
  import { chatsStorage, pinMainMenu, checkStateChange, getChatSortOption, setChatSortOption } from './Storage.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faSquarePlus, faKey } from '@fortawesome/free-solid-svg-icons/index'
  import ChatOptionMenu from './ChatOptionMenu.svelte'
  import logo from '../assets/logo.svg'
  import { clickOutside } from 'svelte-use-click-outside'
  import { startNewChatWithWarning } from './Util.svelte'
  import { chatSortOptions } from './Settings.svelte'
  import { hasActiveModels } from './Models.svelte'

  $: sortedChats = $chatsStorage.sort(getChatSortOption().sortFn)
  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined

  let sortOption = getChatSortOption()
  let hasModels = hasActiveModels()

  const onStateChange = (...args:any) => {
    sortOption = getChatSortOption()
    sortedChats = $chatsStorage.sort(sortOption.sortFn)
    hasModels = hasActiveModels()
  }

  $: onStateChange($checkStateChange)

  let showSortMenu = false

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
        {#key chat.id}
        <ChatMenuItem activeChatId={activeChatId} chat={chat} prevChat={sortedChats[i - 1]} nextChat={sortedChats[i + 1]} />
        {/key}
        {/each}
        {/key}
      {/if}
    </ul>
    <!-- <p class="menu-label">Actions</p> -->
    <div class="level is-mobile bottom-buttons p-1">
      <div class="level-left">
        <div class="dropdown is-left is-up" class:is-active={showSortMenu} use:clickOutside={() => { showSortMenu = false }}>
          <div class="dropdown-trigger">
            <button class="button" aria-haspopup="true" aria-controls="dropdown-menu3" on:click|preventDefault|stopPropagation={() => { showSortMenu = !showSortMenu }}>
              <span class="icon"><Fa icon={sortOption.icon}/></span>
            </button>
          </div>
          <div class="dropdown-menu" id="dropdown-menu3" role="menu">
            <div class="dropdown-content">
              {#each Object.values(chatSortOptions) as opt}
              <a href={'#'} class="dropdown-item" class:is-active={sortOption === opt} on:click|preventDefault={() => { showSortMenu = false; setChatSortOption(opt.value) }}>
                <span class="menu-icon"><Fa icon={opt.icon}/></span> 
                {opt.text}
              </a>
              {/each}
            </div>
          </div>
        </div>
      </div>
      <div class="level-right">
        {#if !hasModels}
        <div class="level-item">
          <a href={'#/'} class="panel-block" class:is-disabled={!hasModels}
            ><span class="greyscale mr-1"><Fa icon={faKey} /></span> API Setting</a
          ></div>
        {:else}
        <div class="level-item">
          <button on:click={() => { $pinMainMenu = false; startNewChatWithWarning(activeChatId) }} class="panel-block button" title="Start new chat with default profile" class:is-disabled={!hasModels}
            ><span class="greyscale mr-1"><Fa icon={faSquarePlus} /></span> New chat</button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</aside>
