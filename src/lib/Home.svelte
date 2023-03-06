<script lang="ts">
  import { addChat, apiKeyStorage } from "./Storage.svelte";

  $: apiKey = $apiKeyStorage;

  export let activeChatId: number;
</script>

<article class="message">
  <div class="message-body">
    <strong><a href="https://github.com/Niek/chatgpt-web">ChatGPT-web</a></strong>
    is a simple one-page web interface to the OpenAI ChatGPT API. To use it, you need to register for
    <a href="https://platform.openai.com/account/api-key" target="_blank" rel="noreferrer">an OpenAI API key</a>
    first. OpenAI bills per token (usage-based), which means it is a lot cheaper than
    <a href="https://openai.com/blog/chatgpt-plus" target="_blank" rel="noreferrer">ChatGPT Plus</a>, unless you use
    more than 10 million tokens per month. All messages are stored in your browser's local storage, so everything is
    <strong>private</strong>. You can also close the browser tab and come back later to continue the conversation.
  </div>
</article>
<article class="message" class:is-danger={!apiKey} class:is-warning={apiKey}>
  <div class="message-body">
    Set your OpenAI API key below:

    <form
      class="field has-addons has-addons-right"
      on:submit|preventDefault={(event) => {
        apiKeyStorage.set(event.target[0].value);
      }}
    >
      <p class="control is-expanded">
        <input
          aria-label="OpenAI API key"
          type="password"
          autocomplete="off"
          class="input"
          class:is-danger={!apiKey}
          value={apiKey}
        />
      </p>
      <p class="control">
        <button class="button is-info" type="submit">Save</button>
      </p>
    </form>

    {#if !apiKey}
      <p class="help is-danger">
        Please enter your <a href="https://platform.openai.com/account/api-key">OpenAI API key</a> above to use ChatGPT-web.
        It is required to use ChatGPT-web.
      </p>
    {/if}
  </div>
</article>
{#if apiKey}
  <article class="message is-info">
    <div class="message-body">
      Select an existing chat on the sidebar, or
      <a
        href={"#"}
        on:click|preventDefault={() => {
          activeChatId = addChat();
        }}>create a new chat</a
      >
    </div>
  </article>
{/if}
