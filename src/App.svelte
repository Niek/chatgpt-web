<script lang="ts">
  import logo from "./assets/logo.svg";
  import Chat from "./lib/Chat.svelte";
  import {
    addChat,
    apiKeyStorage,
    chatsStorage,
    clearChats,
  } from "./lib/Storage.svelte";

  $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id);
  $: apiKey = $apiKeyStorage;

  let activeChatId: number;
</script>

<nav class="navbar" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item" href="/">
      <img src={logo} alt="ChatGPT-web" width="28" height="28" />
      <p class="ml-2 is-size-4 has-text-weight-bold">ChatGPT-web</p>
    </a>
  </div>
</nav>

<!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
<section class="section">
  <div class="container is-fluid">
    <div class="columns">
      <div class="column is-one-fifth">
        <article class="panel is-link">
          <p class="panel-heading">Chats</p>
          {#if sortedChats.length === 0 || !apiKey}
            <a class="panel-block">No chats...</a>
          {:else}
            {#each sortedChats as chat}
              <a class="panel-block" on:click={() => (activeChatId = chat.id)}
                >Chat {chat.id}</a
              >
            {/each}
          {/if}
        </article>
        <article class="panel is-link">
          <a
            class="panel-block {!apiKey ? 'is-disabled' : ''}"
            on:click={() => {
              activeChatId = addChat();
            }}>➕ New chat</a
          >
          <a
            class="panel-block {!apiKey ? 'is-disabled' : ''}"
            on:click={() => {
              clearChats();
              activeChatId = null;
            }}>🗑️ Clear chats</a
          >

          <a
            class="panel-block {!apiKey ? 'is-disabled' : ''}"
            on:click={() => {
              activeChatId = null;
            }}>🔙 Back to home</a
          >
        </article>
      </div>
      <div class="column">
        {#if activeChatId}
          <Chat chatId={activeChatId} />
        {:else}
          <article class="message">
            <div class="message-body">
              <strong
                ><a href="https://github.com/Niek/chatgpt-web">ChatGPT-web</a
                ></strong
              >
              is a simple one-page web interface to the OpenAI ChatGPT API. To
              use it, you need to register for
              <a
                href="https://platform.openai.com/account/api-key"
                target="_blank"
                rel="noreferrer">an OpenAI API key</a
              >
              first. All messages are stored in your browser's local storage, so
              everything is <strong>private</strong>. You can also close the
              browser tab and come back later to continue the conversation.
            </div>
          </article>
          <article class="message {!apiKey ? 'is-danger' : 'is-warning'}">
            <div class="message-body">
              Set your OpenAI API key below:
              <input
                type="text"
                class="input {!apiKey ? 'is-danger' : ''}"
                value={apiKey}
                on:change={(event) => {
                  // @ts-ignore
                  apiKeyStorage.set(event.target.value);
                }}
              />
              {#if !apiKey}
                <p class="help is-danger">
                  Please enter your OpenAI API key above to use ChatGPT-web
                </p>
              {/if}
            </div>
          </article>
          <article class="message is-info">
            <div class="message-body">
              Select an existing chat on the sidebar, or <a
                on:click={() => {
                  activeChatId = addChat();
                }}>create a new chat</a
              >
            </div>
          </article>
        {/if}
      </div>
    </div>
  </div>
</section>

<footer class="footer">
  <div class="content has-text-centered">
    <p>
      <strong>ChatGPT-web</strong>
      by
      <a href="https://niekvandermaas.nl/">Niek van der Maas</a>
      &mdash; see
      <a href="https://github.com/Niek/chatgpt-web">GitHub</a>
      for source code.
    </p>
  </div>
</footer>
