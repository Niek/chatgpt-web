<script lang="ts">
  //import { fetchEventSource } from "@microsoft/fetch-event-source";

  import { apiKeyStorage, chatsStorage, addMessage, clearMessages, findMessageById } from "./Storage.svelte";
  import type {Request, Response, Message, Settings, Chat} from "./Types.svelte";

  import { afterUpdate, onMount } from "svelte";
  import SvelteMarkdown from "svelte-markdown";

  export let chatId: number;
  let updating: boolean = false;

  let input: HTMLTextAreaElement;
  let settings: HTMLDivElement;
  let recognition: any = null;
  let recording = false;

  const settingsMap: Settings[] = [
    {
      key: "temperature",
      name: "Sampling Temperature",
      default: 1,
      type: "number",
    },
    {
      key: "top_p",
      name: "Nucleus Sampling",
      default: 1,
      type: "number",
    },
    {
      key: "n",
      name: "Number of Messages",
      default: 1,
      type: "number",
    },
    {
      key: "max_tokens",
      name: "Max Tokens",
      default: 0,
      type: "number",
    },
    {
      key: "presence_penalty",
      name: "Presence Penalty",
      default: 0,
      type: "number",
    },
    {
      key: "frequency_penalty",
      name: "Frequency Penalty",
      default: 0,
      type: "number",
    },
  ];

  $: chat = $chatsStorage.find((chat) => chat.id === chatId);

  function getShowingMessages(showingMessagesIds: number[], chatMessages: Message[]): Message[] {
    let showingMessages: Message[] = [];
    if (chatMessages.length <= 0) {
        return showingMessages;
    }

    showingMessages.push(chatMessages[0])
    let lastMessage = chatMessages[0];

    // if the last message doesn't have the "children" property, just return the chat messages
    if (!lastMessage.children) {
      return chatMessages;
    }

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

    return showingMessages;
  }

  let showingMessagesIds: number[] = [];
  $: chatMessages = chat.messages;
  $: messages = getShowingMessages(showingMessagesIds, chatMessages);

  const token_price = 0.000002; // $0.002 per 1000 tokens

  // Focus the input on mount
  onMount(() => {
    input.focus();

    // Try to detect speech recognition support
    if ("SpeechRecognition" in window) {
      // @ts-ignore
      recognition = new SpeechRecognition();
    } else if ("webkitSpeechRecognition" in window) {
      // @ts-ignore
      recognition = new webkitSpeechRecognition();
    }

    if (recognition) {
      recognition.interimResults = false;
      recognition.onstart = () => {
        recording = true;
      };
      recognition.onresult = (event) => {
        // Stop speech recognition, submit the form and remove the pulse
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;
        input.value = text;
        recognition.stop();
        recording = false;
        submitForm(true);
      };
    } else {
      console.log("Speech recognition not supported");
    }
  });

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

  const editMessage = (messageId: number, newContent: string) => {
    // editing a message now means
    // 1. removing the message from showingMessagesIds
    // 2. submit the new message to the chat
    // 3. add the new message to showingMessagesIds
    // 4. get the new showingMessages

    // remove message from showingMessagesId
    showingMessagesIds = showingMessagesIds.filter((id) => id !== messageId);

    // get the message
    let message = chatMessages.find((message) => message.id === messageId);
    let newMessage = {
      ...message,
      content: newContent,
    };
    // make a new message with the new content
    let newId = addMessage(chatId, newMessage);
    showingMessagesIds = [...showingMessagesIds, newId];

    submitForm(false, true);
  }

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
      body: JSON.stringify(request),
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
      const request: Request = {
        model: "gpt-3.5-turbo",
        // Submit only the role and content of the messages, provide the previous messages as well for context
        messages: messages
          .map((message): Message => {
            const { role, content } = message;
            return { role, content };
          })
          // Skip error messages
          .filter((message) => message.role !== "error"),

        // Provide the settings by mapping the settingsMap to key/value pairs
        ...settingsMap.reduce((acc, setting) => {
          const value = (settings.querySelector(`#settings-${setting.key}`) as HTMLInputElement).value;
          if (value) {
            acc[setting.key] = setting.type === "number" ? parseFloat(value) : value;
          }
          return acc;
        }, {}),
      };
      response = await (
        await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${$apiKeyStorage}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        })
      ).json();
    } catch (e) {
      response = { error: { message: e.message } } as Response;
    }

    // Hide updating bar
    updating = false;

    return response;
  };

  const submitForm = async (recorded: boolean = false, onEdit: boolean = false): Promise<void> => {
    // Compose the input message
    let inputMessage: Message;
    if (!onEdit) {
      inputMessage = { role: "user", content: input.value };
      addMessage(chatId, inputMessage);
    }

    // Clear the input value
    input.value = "";
    input.blur();

    // Resize back to single line height
    input.style.height = "auto";

    const response = await sendRequest(getShowingMessages(showingMessagesIds, chatMessages));

    if (response.error) {
      addMessage(chatId, {
        role: "error",
        content: `Error: ${response.error.message}`,
      });
    } else {
      response.choices.map((choice) => {
        choice.message.usage = response.usage;
        addMessage(chatId, choice.message);
        // Use TTS to read the response, if query was recorded
        if (recorded && "SpeechSynthesisUtterance" in window) {
          const utterance = new SpeechSynthesisUtterance(choice.message.content);
          speechSynthesis.speak(utterance);
        }
      });
    }
  };

  const suggestName = async (): Promise<void> => {
    const suggestMessage: Message = {
      role: "user",
      content: "Can you give me a 5 word summary of this conversation's topic?",
    };
    addMessage(chatId, suggestMessage);

    const response = await sendRequest(getShowingMessages(showingMessagesIds, chatMessages));

    if (response.error) {
      addMessage(chatId, {
        role: "error",
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

  const showSettings = () => {
    settings.classList.add("is-active");
  };

  const closeSettings = () => {
    settings.classList.remove("is-active");
  };

  const clearSettings = () => {
    settingsMap.forEach((setting) => {
      const input = settings.querySelector(`#settings-${setting.key}`) as HTMLInputElement;
      input.value = "";
    });
  };

  const recordToggle = () => {
    // Check if already recording - if so, stop - else start
    if (recording) {
      recognition?.stop();
      recording = false;
    } else {
      recognition?.start();
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

{#each messages as message}
  {#if message.role === "user"}
    <article
      class="message is-info user-message"
      class:has-text-right={message.content.split("\n").filter((line) => line.trim()).length === 1}
    >
      <div class="message-body content">
        <SvelteMarkdown
          source={message.content}
          options={markedownOptions}
          renderers={{
            /*code: Code*/
          }}
        />
        <a
          href={"#"}
          class="greyscale is-pulled-right ml-2 edit-button"
          on:click|preventDefault={() => {
            let newContent = prompt("Enter the new text for the selected message");
            if (newContent) {
                editMessage(message.id, newContent);
            }
          }}>
          ✏️ <!-- TODO: this could open a modal, a prompt, make the message editable, etc. I think the prompt is too crude of a solution, but it's a start -->
        </a>
        {#if findMessageById(messages, message.parentId).children.length > 1}
          <a
            href={"#"}
            class="greyscale is-pulled-right ml-2 next-message-button"
            on:click|preventDefault={()=>{
            let children = findMessageById(messages, message.parentId).children;
            let childrenIds = children.map((child) => child.id);
            let index = childrenIds.indexOf(message.id);
            // get the next message, wrapping around if necessary
            let nextIndex = (index + 1) % children.length;
            let nextMessageId = children[nextIndex].id;

            showingMessagesIds = showingMessagesIds.filter((id) => id !== message.id);
            showingMessagesIds = [...showingMessagesIds, nextMessageId];
          }}>🔁</a>
        {/if}
      </div>
    </article>
  {:else if message.role === "system" || message.role === "error"}
    <article class="message is-danger">
      <div class="message-body content">
        <SvelteMarkdown
          source={message.content}
          options={markedownOptions}
          renderers={{
            /*code: Code*/
          }}
        />
      </div>
    </article>
  {:else if message.role !== "root"}
    <article class="message is-success">
      <div class="message-body content">
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

<form class="field has-addons has-addons-right" on:submit|preventDefault={() => submitForm()}>
  <p class="control is-expanded">
    <textarea
      class="input is-info is-focused chat-input"
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
        // Resize the textarea to fit the content - auto is important to reset the height after deleting content
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
      }}
      bind:this={input}
    />
  </p>
  <p class="control" class:is-hidden={!recognition}>
    <button class="button is-info is-light" class:is-pulse={recording} on:click|preventDefault={recordToggle}
      ><span class="greyscale">🎤</span></button
    >
  </p>
  <p class="control">
    <button class="button is-link is-light" on:click|preventDefault={showSettings}
      ><span class="greyscale">⚙️</span></button
    >
  </p>
  <p class="control">
    <button class="button is-info" type="submit">Send</button>
  </p>
</form>

<svelte:window
  on:keydown={(event) => {
    if (event.key === "Escape") {
      closeSettings();
    }
  }}
/>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal" bind:this={settings}>
  <div class="modal-background" on:click={closeSettings} />
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Settings</p>
    </header>
    <section class="modal-card-body">
      {#each settingsMap as setting}
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" for="settings-temperature">{setting.name}</label>
          </div>
          <div class="field-body">
            <div class="field">
              <input
                class="input"
                type={setting.type}
                id="settings-{setting.key}"
                placeholder={String(setting.default)}
              />
            </div>
          </div>
        </div>
      {/each}
    </section>

    <footer class="modal-card-foot">
      <button class="button is-info" on:click={closeSettings}>Close settings</button>
      <button class="button" on:click={clearSettings}>Clear settings</button>
    </footer>
  </div>
</div>
