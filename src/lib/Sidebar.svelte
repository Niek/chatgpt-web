<script lang="ts">
  import {params, replace} from 'svelte-spa-router';

  import { addChat, clearChats } from "./Storage.svelte";
  import { exportAsMarkdown } from "./Export.svelte";
  import type { Chat } from "./Types.svelte";

  export let sortedChats: Chat[];
  export let apiKey: string;

  $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined;
</script>

<aside class="menu">
  <p class="menu-label">Chats</p>
  <ul class="menu-list">
    {#if sortedChats.length === 0}
      <li><a href={"#"}>No chats yet...</a></li>
    {:else}
      <li>
        <ul>
          {#each sortedChats as chat}
            <li>
              <a
                href={`#/chat/${chat.id}`}
                class:is-disabled={!apiKey}
                class:is-active={activeChatId === chat.id}>{chat.name || `Chat ${chat.id}`}</a
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
        href={"#/"}
        class="panel-block"
        class:is-disabled={!apiKey}
        class:is-active={!activeChatId}><span class="greyscale mr-2">🔑</span> API key</a
      >
    </li>
    <li>
      <a
        href={"#/chat/new"}
        class="panel-block"
        class:is-disabled={!apiKey}><span class="greyscale mr-2">➕</span> New chat</a
      >
    </li>
    <li>
      <a
        href={"#/"}
        class="panel-block"
        class:is-disabled={!apiKey}
        on:click={() => {
          replace('#/').then(() => {
            clearChats();
          });
        }}><span class="greyscale mr-2">🗑️</span> Clear chats</a
      >
    </li>
    {#if activeChatId}
      <li>
        <a
          href={"#/"}
          class="panel-block"
          class:is-disabled={!apiKey}
          on:click|preventDefault={() => {
            exportAsMarkdown(activeChatId);
          }}><span class="greyscale mr-2">📥</span> Export chat</a
        >
      </li>
    {/if}
  </ul>
</aside>
