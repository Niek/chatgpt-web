<script lang="ts">
  //import { fetchEventSource } from "@microsoft/fetch-event-source";

  import { apiKeyStorage, chatsStorage, addMessage, clearMessages } from "./Storage.svelte";
  import type { Response, Message } from "./Types.svelte";

  import { marked } from "marked";
  import { afterUpdate, onMount } from "svelte";

  export let chatId: number;
  let updating: boolean = false;

  let input: HTMLInputElement;
  $: chat = $chatsStorage.find((chat) => chat.id === chatId);

  let showingMessagesIds: number[] = [];
  $: messages = getShowingMessages(showingMessagesIds);

  function getShowingMessages(showingMessagesIds: number[]): Message[] {
    let chat = $chatsStorage.find((chat) => chat.id === chatId);
    let showingMessages: Message[] = [];
    if (chat.messages.length > 0) {
      showingMessages.push(chat.messages[0])
      let lastMessage = chat.messages[0];

      while (lastMessage.children.length > 0) {
        // get child with the highest timestamp and add to messagesToSend
        let child = lastMessage.children[0];

        for (let i = 0; i < lastMessage.children.length; i++) {
          if (showingMessagesIds.includes(lastMessage.children[i].id)) {
            child = lastMessage.children[i];
            break;
          }

          if (lastMessage.children[i].timestamp > child.timestamp) {
            child = lastMessage.children[i];
          }

        }
        showingMessages.push(child);
        lastMessage = child;
      }

      if (!lastMessage.children && lastMessage.id !== chat.messages[0].id) {
        showingMessages.push(lastMessage);
      }

    }

    return showingMessages;
  }

  let showingMessages = getShowingMessages([]);  // initialise the messages to show using the latest edit for every message
  showingMessagesIds = showingMessages.map((message) => message.id);  // get the ids of the messages to show

  const token_price = 0.000002; // $0.002 per 1000 tokens

  // Focus the input on mount
  onMount(() => input.focus());

  // Scroll to the bottom of the chat on update
  afterUpdate(() => {
    // Scroll to the bottom of the page after any updates to the messages array
    window.scrollTo(0, document.body.scrollHeight);
    input.focus();
  });

  const editMessage = (messageId: number, newContent: string) => {
    // editing a message now means
    // 1. removing the message from showingMessagesIds
    // 2. submit the new message to the chat
    // 3. add the new message to showingMessagesIds
    // 4. get the new showingMessages

    let chat = $chatsStorage.find((chat) => chat.id === chatId);

    // remove message from showingMessagesId
    showingMessagesIds = showingMessagesIds.filter((id) => id !== messageId);

    // get the message
    let message = chat.messages.find((message) => message.id === messageId);

    // make a new message with the new content
    addMessage(chatId, {
      role: "user",
      content: newContent,
      parentId: message.parentId,
    });

    showingMessages = getShowingMessages(showingMessagesIds);
  }

  const send = async () => {
    // Compose the input message
    const inputMessage: Message = {
      role: "user",
      content: input.value
    };
    addMessage(chatId, inputMessage);

    // after sending a new message we want to show all the messages and update the showingMessagesIds
    showingMessages = getShowingMessages(showingMessagesIds);
    showingMessagesIds.push(inputMessage.id);

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

    const response: Response = await (
      await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${$apiKeyStorage}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          // Remove the usage property from all messages
          messages: showingMessages.map((message): Message => {
            const { role, content } = message;
            return { role, content };
          }),
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

    // after receiving a new message we want to show all the messages and update the showingMessagesIds
    showingMessages = getShowingMessages(showingMessagesIds);
    showingMessagesIds.push(inputMessage.id);
  };
</script>

<nav class="level is-mobile">
  <div class="level-left">
    <div class="level-item">
      <p class="subtitle is-5">Chat {chatId}</p>
    </div>
  </div>

  <div class="level-right">
    <p class="level-item">
      <button
        class="button is-warning"
        on:click={() => {
          clearMessages(chatId);
        }}><span class="greyscale mr-2">🗑️</span> Clear messages</button
      >
    </p>
  </div>
</nav>

{#each getShowingMessages(showingMessagesIds) as message}
  {#if message.role === "user"}
    <article class="message is-info has-text-right usermessage">
      <div class="message-body">
        <a
          href={"#"}
          class="greyscale is-pulled-right ml-2 is-hidden editbutton"
          on:click={() => {
            input.value = message.content;
            input.focus();
          }}
        >
          ✏️
        </a>
        {@html marked(message.content)}
      </div>
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
            This message was generated using <span class="has-text-weight-bold">{message.usage.total_tokens}</span>
            tokens ~=
            <span class="has-text-weight-bold">${(message.usage.total_tokens * token_price).toFixed(6)}</span>
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
