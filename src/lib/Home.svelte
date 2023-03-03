<script lang="ts">
  import { addChat, apiKeyStorage } from "./Storage.svelte";

  $: apiKey = $apiKeyStorage;

  export let activeChatId: number;
</script>

<article class="message">
  <div class="message-body">
    <strong
      ><a href="https://github.com/Niek/chatgpt-web">ChatGPT-web</a></strong
    >
    is a simple one-page web interface to the OpenAI ChatGPT API. To use it, you
    need to register for
    <a
      href="https://platform.openai.com/account/api-key"
      target="_blank"
      rel="noreferrer">an OpenAI API key</a
    >
    first. All messages are stored in your browser's local storage, so everything
    is <strong>private</strong>. You can also close the browser tab and come
    back later to continue the conversation.
  </div>
</article>
<article class="message {!apiKey ? 'is-danger' : 'is-warning'}">
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
          type="text"
          class="input {!apiKey ? 'is-danger' : ''}"
          value={apiKey}
        />
      </p>
      <p class="control">
        <button class="button is-info" type="submit">Save</button>
      </p>
    </form>

    {#if !apiKey}
      <p class="help is-danger">
        Please enter your OpenAI API key above to use ChatGPT-web
      </p>
    {/if}
  </div>
</article>
<article class="message is-info">
  <div class="message-body">
    <!-- svelte-ignore a11y-missing-attribute a11y-click-events-have-key-events -->
    Select an existing chat on the sidebar, or
    <a
      class={!apiKey ? "is-disabled" : ""}
      on:click={() => {
        activeChatId = addChat();
      }}>create a new chat</a
    >
  </div>
</article>
