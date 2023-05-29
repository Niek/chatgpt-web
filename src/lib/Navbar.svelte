<script lang="ts">
    import { params } from 'svelte-spa-router'
import logo from '../assets/logo.svg'
import ChatOptionMenu from './ChatOptionMenu.svelte'
let showChatMenu

$: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined
</script>

<nav class="navbar is-fixed-top" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item" href={'#/'}>
      <img src={logo} alt="ChatGPT-web" width="28" height="28" />
      <p class="ml-2 is-size-4 has-text-weight-bold">ChatGPT-web</p>
    </a>
    
    <div class="chat-option-menu navbar-item is-pulled-right">
      <ChatOptionMenu bind:show={showChatMenu} bind:chatId={activeChatId} />
    </div>
  </div>
</nav>
