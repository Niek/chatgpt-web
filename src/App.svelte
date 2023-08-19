<script lang="ts">
  import Router, { location, replace, querystring } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'

  import Navbar from './lib/Navbar.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import Home from './lib/Home.svelte'
  import Chat from './lib/Chat.svelte'
  import NewChat from './lib/NewChat.svelte'
  import { chatsStorage, setGlobalSettingValueByKey } from './lib/Storage.svelte'
  import { Modals, closeModal } from 'svelte-modals'
  import { dispatchModalEsc, checkModalEsc } from './lib/Util.svelte'
  import { set as setOpenAI } from './lib/providers/openai/util.svelte'
  import { hasActiveModels } from './lib/Models.svelte'

  // Check if the API key is passed in as a "key" query parameter - if so, save it
  // Example: https://niek.github.io/chatgpt-web/#/?key=sk-...
  const urlParams: URLSearchParams = new URLSearchParams($querystring)
  if (urlParams.has('key')) {
    setOpenAI({ apiKey: urlParams.get('key') as string })
  }
  if (urlParams.has('petals')) {
    console.log('enablePetals')
    setGlobalSettingValueByKey('enablePetals', true)
  }

  // The definition of the routes with some conditions
  const routes = {
    '/': Home,

    '/chat/new': wrap({
      component: NewChat,
      conditions: () => {
        return hasActiveModels()
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

  const onLocationChange = (...args:any) => {
    // close all modals on route change
    dispatchModalEsc()
  }

  $: onLocationChange($location)

</script>

<Navbar />
<div class="side-bar-column">
  <Sidebar />
</div>
<div class="main-content-column" id="content">
  {#key $location}
    <Router {routes} on:conditionsFailed={() => replace('/')}/>
  {/key}
</div>

<Modals>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    slot="backdrop"
    class="backdrop"
    on:click={closeModal}
  />
</Modals>

<svelte:window
  on:keydown={(e) => checkModalEsc(e)}
/>

<style>
  .backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    background: transparent
  }
</style>
