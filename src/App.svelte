<script lang="ts">
  import Router, { location, querystring, replace } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'

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

<section class="flex flex-col grow">
    <div class="flex flex-col grow gap-x-2 items-stretch md:flex-row">
      <div id="sidebar" class="flex basis-0 md:basis-1/5">
        <Sidebar />
      </div>
      <div  id="content" class="flex grow basis-0 md:basis-4/5 flex-col p-4">
        {#key $location}
          <Router {routes} on:conditionsFailed={() => replace('/')}/>
        {/key}
      </div>
    </div>


</section>

<Footer />
