<script lang="ts">
  import Router, { location, querystring, replace } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'
  import { Alert } from 'flowbite-svelte'

  import Navbar from './lib/Navbar.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import Footer from './lib/Footer.svelte'
  import Home from './lib/Home.svelte'
  import Chat from './lib/Chat.svelte'
  import NewChat from './lib/NewChat.svelte'
  import { chatsStorage, apiKeyStorage } from './lib/Storage.svelte'

  // Check if the API key is passed in as a "key" query parameter - if so, save it
  // Example: https://niek.github.io/chatgpt-web/#/?key=sk-...
  const urlParams: URLSearchParams = new URLSearchParams($querystring)
  if (urlParams.has('key')) {
    apiKeyStorage.set(urlParams.get('key') as string)
  }

  // The definition of the routes with some conditions
  const routes = {
    '/': Home,

    '/chat/new': wrap({
      component: NewChat,
      conditions: () => {
        return !!$apiKeyStorage
      }
    }),

    '/chat/:chatId': wrap({
      component: Chat,
      conditions: (detail) => {
        return $chatsStorage.find((chat) => chat.id === parseInt(detail?.params?.chatId as string)) !== undefined
      }
    }),

    '*': Home
  }
</script>

<Navbar />

<section class="section">
  <div class="container is-fullhd">
    <div class="columns">
      <div class="column is-one-fifth">
        <Sidebar />
      </div>
      <div class="column is-four-fifths" id="content">
        {#key $location}
          <Router {routes} on:conditionsFailed={() => replace('/')}/>
        {/key}
      </div>
    </div>
  </div>
</section>

<Footer />
