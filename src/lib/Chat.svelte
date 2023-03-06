<script lang="ts">
  //import { fetchEventSource } from "@microsoft/fetch-event-source";

  import { apiKeyStorage, chatsStorage, addMessage, clearMessages } from "./Storage.svelte";
  import type { Response, Message } from "./Types.svelte";

  import { afterUpdate, onMount } from "svelte";
  import SvelteMarkdown from "svelte-markdown";

  export let chatId: number;
  let updating: boolean = false;

  let input: HTMLTextAreaElement;
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

  // Marked options
  const markedownOptions = {
    gfm: true,
    breaks: true,
  };

  const sendRequest = async (messages: Message[]): Promise<Response> => {
    // Send API request
    /*
    // Not working yet: a way to get the response as a stream
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
    // Show updating bar
    updating = true;

    let response: Response;
    try {
      response = await (
        await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${$apiKeyStorage}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            // Submit only the role and content of the messages, provide the previous messages as well for context
            messages: messages
              .map((message): Message => {
                const { role, content } = message;
                return { role, content };
              })
              // Skip system messages
              .filter((message) => message.role !== "system"),
            // temperature: 1
            // top_p: 1
            // n: 1
            //stream: false,
            // stop: null
            //max_tokens: 4096,
          }),
        })
      ).json();
    } catch (e) {
      response = { error: { message: e.message } };
    }

    // Hide updating bar
    updating = false;

    return response;
  };

  const submitForm = async (): Promise<void> => {
    // Compose the input message
    const inputMessage: Message = { role: "user", content: input.value };
    addMessage(chatId, inputMessage);

    // Clear the input value
    input.value = "";

    // Resize back to single line height
    input.style.height = "auto";

    const response = await sendRequest(chat.messages);

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

  const suggestName = async (): Promise<void> => {
    const suggestMessage: Message = {
      role: "user",
      content: "Can you give me a 5 word summary of this conversation's topic?",
    };
    addMessage(chatId, suggestMessage);

    const response = await sendRequest(chat.messages);

    if (response.error) {
      addMessage(chatId, {
        role: "system",
        content: `Error: ${response.error.message}`,
      });
    } else {
      response.choices.map((choice) => {
        choice.message.usage = response.usage;
        addMessage(chatId, choice.message);
        chat.name = choice.message.content;
        chatsStorage.set($chatsStorage);
      });
    }
  };

  const deleteChat = () => {
    if (confirm("Are you sure you want to delete this chat?")) {
      chatsStorage.update((chats) => chats.filter((chat) => chat.id !== chatId));
      chatId = null;
    }
  };
</script>

<nav class="level chat-header">
  <div class="level-left">
    <div class="level-item">
      <p class="subtitle is-5">
        {chat.name || `Chat ${chat.id}`}
        <a
          href={"#"}
          class="greyscale ml-2 is-hidden has-text-weight-bold editbutton"
          title="Rename chat"
          on:click|preventDefault={() => {
            let newChatName = prompt("Enter a new name for this chat", chat.name);
            if (newChatName) {
              chat.name = newChatName;
              chatsStorage.set($chatsStorage);
            }
          }}
        >
          ✏️
        </a>
        <a
          href={"#"}
          class="greyscale ml-2 is-hidden has-text-weight-bold editbutton"
          title="Suggest a chat name"
          on:click|preventDefault={suggestName}
        >
          💡
        </a>
        <a
                href={"#"}
                class="greyscale ml-2 is-hidden editbutton"
                title="Delete this chat"
                on:click|preventDefault={deleteChat}
        >
          🗑️
        </a>
      </p>
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

{#each chat.messages as message}
  {#if message.role === "user"}
    <article
      class="message is-info user-message"
      class:has-text-right={message.content.split("\n").filter((line) => line.trim()).length === 1}
    >
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
        <SvelteMarkdown
          source={message.content}
          options={markedownOptions}
          renderers={{
            /*code: Code*/
          }}
        />
      </div>
    </article>
  {:else if message.role === "system"}
    <article class="message is-danger">
      <div class="message-body">
        <SvelteMarkdown
          source={message.content}
          options={markedownOptions}
          renderers={{
            /*code: Code*/
          }}
        />
      </div>
    </article>
  {:else}
    <article class="message is-success">
      <div class="message-body">
        <SvelteMarkdown
          source={message.content}
          options={markedownOptions}
          renderers={{
            /*code: Code*/
          }}
        />
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

<form class="field has-addons has-addons-right" on:submit|preventDefault={submitForm}>
  <p class="control is-expanded">
    <textarea
      class="input is-info is-medium is-focused chat-input"
      placeholder="Type your message here..."
      rows="1"
      on:keydown={(e) => {
        // Only send if Enter is pressed, not Shift+Enter
        if (e.key === "Enter" && !e.shiftKey) {
          submitForm();
          e.preventDefault();
        }
      }}
      on:input={(e) => {
        // Resize the textarea to fit the content
        input.style.height = input.scrollHeight + "px";
      }}
      bind:this={input}
    />
  </p>
  <p class="control">
    <button class="button is-info is-medium" type="submit">Send</button>
  </p>
</form>
