<script lang="ts">
  //import { fetchEventSource } from "@microsoft/fetch-event-source";

  import {
    apiKeyStorage,
    chatsStorage,
    addMessage,
    clearMessages,
  } from "./Storage.svelte";
  import type { Message } from "./Types.svelte";

  import { marked } from "marked";
  import { afterUpdate, onMount } from "svelte";

  export let chatId: number;
  let updating: boolean = false;

  let input: HTMLInputElement;
  $: chat = $chatsStorage.find((chat) => chat.id === chatId);
  const token_price = 0.000002; // $0.002 per 1000 tokens

  // Focus the input on mount
  onMount(() => input.focus());

  // Scroll to the bottom of the chat on update
  afterUpdate(() => {
    // Scroll to the bottom of the page after any updates to the messages array
    window.scrollTo(0, document.body.scrollHeight);
    input.focus();
  });

  const send = async () => {
    // Compose the input message
    const inputMessage: Message = { role: "user", content: input.value };
    addMessage(chatId, inputMessage);

    // Clear the input value
    input.value = "";

    // Show updating bar
    updating = true;

    // Send API request
    /*
    await fetchEventSource("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${$apiKeyStorage}`,
        "Content-Type": "text/event-stream",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages, // Provide the previous messages as well for context
        // temperature: 1
        // top_p: 1
        // n: 1
        stream: false,
        // stop: null
        max_tokens: 4096,
      }),
      onmessage(ev) {
        console.log(ev);
      },
      onerror(err) {
        throw err;
      },
    });
    */
    const response = await (
      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${$apiKeyStorage}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          // Remove the usage property from all messages
          messages: chat.messages.map((message): Message => {
            const { usage, ...rest } = message;
            return rest;
          }),
          // Provide the previous messages as well for context
          // temperature: 1
          // top_p: 1
          // n: 1
          //stream: false,
          // stop: null
          //max_tokens: 4096,
        }),
      })
    ).json();

    console.log(response);

    // Hide updating bar
    updating = false;

    if (response.error) {
      addMessage(chatId, {
        role: "system",
        content: `Error: ${response.error.message}`,
      });
    } else {
      response.choices.map((choice) => {
        choice.message.usage = response.usage;
        addMessage(chatId, choice.message);
      });
    }
  };
</script>

<button
  class="button is-warning is-pulled-right"
  on:click={() => {
    clearMessages(chatId);
  }}>🗑️ Clear messages</button
>

<p class="subtitle">Chat {chatId}</p>

{#each chat.messages as message}
  {#if message.role === "user"}
    <article class="message is-info has-text-right">
      <div class="message-body">{@html marked(message.content)}</div>
    </article>
  {:else if message.role === "system"}
    <article class="message is-danger">
      <div class="message-body">{@html marked(message.content)}</div>
    </article>
  {:else}
    <article class="message is-success">
      <div class="message-body">
        {@html marked(message.content)}
        {#if message.usage}
          <p class="is-size-7">
            This message was generated using <span class="has-text-weight-bold"
              >{message.usage.total_tokens}</span
            >
            tokens ~=
            <span class="has-text-weight-bold"
              >${(message.usage.total_tokens * token_price).toFixed(6)}</span
            >
          </p>
        {/if}
      </div>
    </article>
  {/if}
{/each}

{#if updating}
  <progress class="progress is-small is-dark" max="100" />
{/if}

<form class="field has-addons has-addons-right" on:submit|preventDefault={send}>
  <p class="control is-expanded">
    <input
      class="input is-info is-medium is-focused"
      type="text"
      placeholder="Type your message here..."
      bind:this={input}
    />
  </p>
  <p class="control">
    <button class="button is-info is-medium" type="submit">Send</button>
  </p>
</form>
