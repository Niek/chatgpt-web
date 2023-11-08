<script lang="ts">
  import { params } from 'svelte-spa-router'
  import { pinMainMenu } from './Storage.svelte'
  import logo from '../assets/logo.svg'
  import ChatOptionMenu from './ChatOptionMenu.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons/index'

$: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined
</script>

<nav class="navbar is-fixed-top" aria-label="main navigation">
  <div class="navbar-brand">
    <div class="navbar-item">
      
      {#if $pinMainMenu}
      <button class="button" on:click|stopPropagation={() => { $pinMainMenu = false }}>
        <span class="icon">
          <Fa icon={faXmark} />
        </span>
      </button>
      {:else}
      <button class="button" on:click|stopPropagation={() => { $pinMainMenu = true }}>
        <span class="icon">
          <Fa icon={faBars} />
        </span>
      </button>
      {/if}
    </div>
    <a class="navbar-item" href={'#/'}>
      <img src={logo} alt="ChatGPT-web" width="24" height="24" />
      <p class="ml-2 is-size-6 has-text-weight-bold">ChatGPT-web</p>
    </a>
    <div class="chat-option-menu navbar-item is-pulled-right">
      <ChatOptionMenu bind:chatId={activeChatId} />
    </div>
  </div>
</nav>
