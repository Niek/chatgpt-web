<script lang="ts">
  import Router, { location } from 'svelte-spa-router'
  import routes from './routes'

  import Navbar from './lib/Navbar.svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import Footer from './lib/Footer.svelte'

  import { apiKeyStorage, chatsStorage } from './lib/Storage.svelte'

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)
  $: apiKey = $apiKeyStorage

  // Check if the API key is passed in as a "key" query parameter - if so, save it
  const urlParams: URLSearchParams = new URLSearchParams(window.location.search)
  if (urlParams.has('key')) {
    apiKeyStorage.set(urlParams.get('key') as string)
  }
</script>

<Navbar />

<section class="section">
  <div class="container is-fullhd">
    <div class="columns">
      <div class="column is-one-fifth">
        <Sidebar bind:apiKey bind:sortedChats />
      </div>
      <div class="column is-four-fifths">
        {#key $location}
          <Router {routes} />
        {/key}
      </div>
    </div>
  </div>
</section>

<Footer />
