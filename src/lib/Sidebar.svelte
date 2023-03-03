<script lang="ts">
  import { addChat, clearChats } from "./Storage.svelte";
  import type { Chat } from "./Types.svelte";

  export let activeChatId: number;
  export let sortedChats: Chat[];
  export let apiKey: string;
</script>

<!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
<aside class="menu">
  <p class="menu-label">Chats</p>
  <ul class="menu-list">
    {#if sortedChats.length === 0}
      <a class="panel-block">No chats yet...</a>
    {:else}
      <li>
        <ul>
          {#each sortedChats as chat}
            <li>
              <a
                class="panel-block {!apiKey
                  ? 'is-disabled'
                  : ''} {activeChatId === chat.id
                  ? 'has-background-light'
                  : ''}"
                on:click={() => (activeChatId = chat.id)}>Chat {chat.id}</a
              >
            </li>
          {/each}
        </ul>
      </li>
    {/if}
  </ul>
  <p class="menu-label">Actions</p>
  <ul class="menu-list">
    <li>
      <a
        class="panel-block {!apiKey ? 'is-disabled' : ''} {activeChatId
          ? ''
          : 'has-background-light'}"
        on:click={() => {
          activeChatId = null;
        }}><span class="greyscale mr-2">🔑</span> API key</a
      >
    </li>
    <li>
      <a
        class="panel-block {!apiKey ? 'is-disabled' : ''}"
        on:click={() => {
          activeChatId = addChat();
        }}><span class="greyscale mr-2">➕</span> New chat</a
      >
    </li>
    <li>
      <a
        class="panel-block {!apiKey ? 'is-disabled' : ''}"
        on:click={() => {
          clearChats();
          activeChatId = null;
        }}><span class="greyscale mr-2">🗑️</span> Clear chats</a
      >
    </li>
  </ul>
</aside>
