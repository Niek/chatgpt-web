<script lang="ts">
  import Navbar from "./lib/Navbar.svelte";
  import Sidebar from "./lib/Sidebar.svelte";
  import Home from "./lib/Home.svelte";
  import Chat from "./lib/Chat.svelte";
  import Footer from "./lib/Footer.svelte";

  import { apiKeyStorage, chatsStorage } from "./lib/Storage.svelte";

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id);
  $: apiKey = $apiKeyStorage;

  // Check if the API key is passed in as a "key" query parameter - if so, save it
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("key")) {
    apiKeyStorage.set(urlParams.get("key")!);
  }

  let activeChatId: number;
</script>

<Navbar />

<section class="section">
  <div class="container is-fullhd">
    <div class="columns">
      <div class="column is-one-fifth">
        <Sidebar bind:apiKey bind:sortedChats bind:activeChatId />
      </div>
      <div class="column is-four-fifths">
        {#if activeChatId}
          <Chat bind:chatId={activeChatId} />
        {:else}
          <Home bind:activeChatId />
        {/if}
      </div>
    </div>
  </div>
</section>

<Footer />
