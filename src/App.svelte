<script lang="ts">
  import Router, { replace, router } from 'svelte-spa-router'
  import { wrap } from 'svelte-spa-router/wrap'

  import Navbar from './lib/Navbar.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import Home from './lib/Home.svelte'
  import Chat from './lib/Chat.svelte'
  import NewChat from './lib/NewChat.svelte'
  import { chatsStorage, setGlobalSettingValueByKey } from './lib/Storage.svelte'
  import { Modals, closeModal } from 'svelte-modals/legacy'
  import { dispatchModalEsc, checkModalEsc } from './lib/Util.svelte'
  import { set as setOpenAI } from './lib/providers/openai/util.svelte'
  import { hasActiveModels } from './lib/Models.svelte'
  import { routeLocation } from './lib/RouteState'

  // Check if the API key is passed in as a "key" query parameter - if so, save it
  // Example: https://niek.github.io/chatgpt-web/#/?key=sk-...
  const urlParams: URLSearchParams = new URLSearchParams(router.querystring || '')
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

  let didInitializeRoute = false

  $: if ($routeLocation) {
    if (didInitializeRoute) dispatchModalEsc()
    else didInitializeRoute = true
  }

</script>

<Navbar />
<div class="side-bar-column">
  <Sidebar />
</div>
<div class="main-content-column" id="content">
  {#key $routeLocation}
    <Router {routes} onConditionsFailed={() => replace('/')}/>
  {/key}
</div>

<Modals>
  <button
    slot="backdrop"
    type="button"
    class="backdrop"
    aria-label="Close modal"
    on:click={closeModal}
  ></button>
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
