<script lang="ts">
  // import { fetchEventSource } from '@microsoft/fetch-event-source'
  import { apiKeyStorage, chatsStorage, addMessage, setSystemText, clearMessages, addLog } from './Storage.svelte'
  import {
    type Request,
    type Response,
    type Message,
    type Chat


  } from './Types.svelte'
  import Code from './Code.svelte'
  import Prompts from './Prompts.svelte'
  import Messages from './Messages.svelte'
  import { afterUpdate, onMount } from 'svelte'
  import { replace } from 'svelte-spa-router'
  import SettingModal from './SettingModal.svelte'
  import { modelSetting, settingsMap, apiBase } from './Settings.svelte'
  import SvelteMarkdown from 'svelte-markdown'

  // This makes it possible to override the OpenAI API base URL in the .env file

  export let params = { chatId: '' }
  const chatId: number = parseInt(params.chatId)

  let updating: boolean = false
  let loadingcontent: string
  let input: HTMLTextAreaElement
  let systemText: HTMLTextAreaElement
  let settings: HTMLDivElement
  let chatNameSettings: HTMLFormElement
  let recognition: any = null
  let recording = false
  let keepSystemPrompt = true

  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat

  onMount(async () => {
  // Pre-select the last used model
    if (chat.messages.length > 0) {
      modelSetting.default = chat.messages[chat.messages.length - 1].model || modelSetting.default
    }

    // Focus the input on mount
    input.focus()

    // Try to detect speech recognition support
    if ('SpeechRecognition' in window) {
    // @ts-ignore
      recognition = new window.SpeechRecognition()
    } else if ('webkitSpeechRecognition' in window) {
    // @ts-ignore
      recognition = new window.webkitSpeechRecognition() // eslint-disable-line new-cap
    }

    if (recognition) {
      recognition.interimResults = false
      recognition.onstart = () => {
        recording = true
      }
      recognition.onresult = (event) => {
      // Stop speech recognition, submit the form and remove the pulse
        const last = event.results.length - 1
        const text = event.results[last][0].transcript
        input.value = text
        recognition.stop()
        recording = false
        submitForm(true)
      }
    } else {
      console.log('Speech recognition not supported')
    }
  })
  // Scroll to the bottom of the chat on update
  afterUpdate(() => {
    //  System-Text loses focus with every keypress without also we don't want to scroll if we just opened the system text area
    if (active && isElementOffScreen(input)) {
      // Scroll to the bottom of the page after any updates to the messages array
      input.scrollIntoView({ behavior: 'smooth', block: 'end' })
      input.focus()
    }
  })


  // Send API request
  const sendRequest = async (chat: Chat): Promise<Response> => {
    // Show updating bar
    updating = true
    const messages = [...chat.messages]
    chat.systemText && messages.unshift(chat.systemText)
    let response: Response
    const message: Message = { content: '', role: null }
    try {
      const request: Request = {
        // Submit only the role and content of the messages, provide the previous messages as well for context
        messages: messages
          .map((message): Message => {
            const { role, content } = message
            return { role, content }
          })
          // Skip error messages
          .filter((message) => message.role !== 'error'),

        // Provide the settings by mapping the settingsMap to key/value pairs
        ...settingsMap.reduce((acc, setting) => {
          const value = (settings.querySelector(`#settings-${setting.key}`) as HTMLInputElement).value

          if (value !== '') {
            acc[setting.key] = (setting.type === 'number' || setting.type === 'checkbox') ? JSON.parse(value) : value
          }
          return acc
        }, {})
      }


      const responseStream = await fetch(apiBase + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${$apiKeyStorage}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: new AbortController().signal // create an AbortController to cancel the request if needed
      }).then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch response: ${res.statusText}`)
        }
        return res.body
      })
      for await (const line of readLines(responseStream)) {
        if (!response) {
          response = line
        }
        if (line.choices[0].delta.content !== undefined) { message.content += line.choices[0].delta.content }
        if (line.choices[0].delta.role in ['user', 'system', 'error', 'assistant']) { message.role += line.choices[0].delta.role }
      }
    } catch (e) {
      return { error: { message: e.message } } as Response
    }
    // Hide updating bar
    updating = false
    response.choices[0].message = message
    return response
  }

  async function * readLines (responseStream:ReadableStream<Uint8Array>) {
    const reader = responseStream.getReader()

    while (true) {
      const { done, value } = await reader.read()
      const text = new TextDecoder().decode(value)
      const lines = text
        .split('\n')
        .filter((line) => line.trim().startsWith('data: '))
      if (done) {
        break
      }
      for (const line of lines) {
        console.log(text)
        if (line.slice(6) === '[DONE]') return
        yield JSON.parse(line.slice(6)) as Response
      }
    }

    reader.releaseLock()
  }


  // Define a function to write to the log file
  const writeToLogFile = async (data: any) => {
  // Get the current time
    const currentTime = new Date().toISOString()

    // Convert the data to a string
    const dataAsString = JSON.stringify(data)

    // Create a log message with the current time and response data
    const logMessage = `${currentTime}: ${dataAsString}\n`

    // Write the log message to the log file

    addLog(logMessage)
  }

  const submitForm = async (recorded: boolean = false): Promise<void> => {
    // Compose the system prompt message if there are no messages yet - disabled for now
    /*
    if (chat.messages.length === 0) {
      const systemPrompt: Message = { role: 'system', content: 'You are a helpful assistant.' }
      addMessage(chatId, systemPrompt)
    }
    */
    if (systemText.value.length > 0) {
      const systemPrompt: Message = { role: 'system', content: systemText.value }
      setSystemText(chatId, systemPrompt)
    }
    // Compose the input message
    const inputMessage: Message = { role: 'user', content: input.value }
    addMessage(chatId, inputMessage)

    // Clear the input value
    input.value = ''
    input.blur()

    // Resize back to single line height
    input.style.height = 'auto'

    const response = await sendRequest(chat)
    // Send the request and get the response

    if (response.error) {
      addMessage(chatId, {
        role: 'error',
        content: `Error: ${response.error.message}`
      })
    } else {
      response.choices.forEach((choice) => {
        // Store usage and model in the message
        choice.message.usage = response.usage
        choice.message.model = response.model

        // Remove whitespace around the message that the OpenAI API sometimes returns
        choice.message.content = choice.message.content.trim()
        addMessage(chatId, choice.message)
        writeToLogFile(choice.message)
        // Use TTS to read the response, if query was recorded
        if (recorded && 'SpeechSynthesisUtterance' in window) {
          const utterance = new SpeechSynthesisUtterance(choice.message.content)
          window.speechSynthesis.speak(utterance)
        }
      })
    }
  }

  const suggestName = async (): Promise<void> => {
    const suggestMessage: Message = {
      role: 'user',
      content: "Can you give me a 5 word summary of this conversation's topic?"
    }
    addMessage(chatId, suggestMessage)

    const response = await sendRequest(chat)

    if (response.error) {
      addMessage(chatId, {
        role: 'error',
        content: `Error: ${response.error.message}`
      })
    } else {
      response.choices.forEach((choice) => {
        choice.message.usage = response.usage
        addMessage(chatId, choice.message)
        chat.name = choice.message.content
        chatsStorage.set($chatsStorage)
      })
    }
  }

  export const showSettings = () => {
    settings.classList.add('is-active')
  }

  const deleteChat = () => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      replace('/').then(() => {
        chatsStorage.update((chats) => chats.filter((chat) => chat.id !== chatId))
      })
    }
  }

  const showChatNameSettings = () => {
    chatNameSettings.classList.add('is-active');
    (chatNameSettings.querySelector('#settings-chat-name') as HTMLInputElement).focus();
    (chatNameSettings.querySelector('#settings-chat-name') as HTMLInputElement).select()
  }

  const saveChatNameSettings = () => {
    const newChatName = (chatNameSettings.querySelector('#settings-chat-name') as HTMLInputElement).value
    // save if changed
    if (newChatName && newChatName !== chat.name) {
      chat.name = newChatName
      chatsStorage.set($chatsStorage)
    }
    closeChatNameSettings()
  }

  const closeChatNameSettings = () => {
    chatNameSettings.classList.remove('is-active')
  }


  const recordToggle = () => {
    // Check if already recording - if so, stop - else start
    if (recording) {
      recognition?.stop()
      recording = false
    } else {
      recognition?.start()
    }
  }
  let active: boolean = false

  function isElementOffScreen (el) {
    const rect = el.getBoundingClientRect()
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth

    return (
      rect.bottom < 0 ||
      rect.right < 0 ||
      rect.left > windowWidth ||
      rect.top > windowHeight
    )
  }
</script>

<nav class="level chat-header">
  <div class="level-left">
    <div class="level-item">
      <p class="subtitle is-5">
        {chat.name || `Chat ${chat.id}`}
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Rename chat" on:click|preventDefault={showChatNameSettings}>✏️</a>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Suggest a chat name" on:click|preventDefault={suggestName}>💡</a>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Delete this chat" on:click|preventDefault={deleteChat}>🗑️</a>
      </p>

    </div>
  </div>
  <div class="level-right">
    <div class="level-right">
      <p class="level-item">
        <button class="button" class:is-success={!active} on:click={() => { active = !active }}><span class="greyscale mr-2">💭</span> System Prompt</button>
      </p>
    </div>
    <div class="level-item">
      <p class="level-item">
        <button class="button is-warning" on:click={() => { clearMessages(chatId) }}><span class="greyscale mr-2">🗑️</span> Clear messages</button>
        <label class="checkbox">
          <input type="checkbox" bind:checked="{keepSystemPrompt}">
          &nbsp;Keep system prompt
        </label>
      </p>
    </div>
  </div>
</nav>
<p class="box" class:is-vanished={active}>
  <textarea
    class="input is-info is-focused system-input"
    placeholder="Type context here... 'You are a helpful AI'"
    rows="1"
    form="chat-form"
    value={chat.systemText?.content || ''}
    on:input={(e) => {
      // Resize the textarea to fit the content - auto is important to reset the height after deleting content
      systemText.style.height = 'auto'
      systemText.style.height = systemText.scrollHeight + 'px'
    }}
    bind:this={systemText}
  />
</p>
<Messages bind:input messages={chat.messages} defaultModel={modelSetting.default} />

{#if updating}
  <article class="message is-success assistant-message">
    <div class="message-body content">
      <SvelteMarkdown source={loadingcontent} options={{
        gfm: true, // Use GitHub Flavored Markdown
        breaks: true, // Enable line breaks in markdown
        mangle: false // Do not mangle email addresses
      }} renderers={{ code: Code, html: Code }}/>
      <span class="is-loading" />
    </div>
  </article>
{/if}

{#if chat.messages.length === 0}
<Prompts bind:input />
{/if}

<form id="chat-form" class="field has-addons has-addons-right is-align-items-flex-end" on:submit|preventDefault={() => submitForm()}>
  <p class="control is-expanded">
    <textarea
      class="input is-info is-focused chat-input"
      placeholder="Type your message here..."
      rows="1"
      on:keydown={(e) => {
        // Only send if Enter is pressed, not Shift+Enter
        if (e.key === 'Enter' && !e.shiftKey) {
          submitForm()
          e.preventDefault()
        }
      }}
      on:input={(e) => {
        // Resize the textarea to fit the content - auto is important to reset the height after deleting content
        input.style.height = 'auto'
        input.style.height = input.scrollHeight + 'px'
      }}
      bind:this={input}
    />
  </p>
  <p class="control" class:is-hidden={!recognition}>
    <button class="button" class:is-pulse={recording} on:click|preventDefault={recordToggle}
      ><span class="greyscale">🎤</span></button
    >
  </p>
  <p class="control">
    <button class="button" on:click|preventDefault={showSettings}><span class="greyscale">⚙️</span></button>
  </p>
  <p class="control">
    <button class="button is-info" type="submit">Send</button>
  </p>
</form>
<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') {
      closeChatNameSettings()
    }
  }}
/>
  <SettingModal bind:settings />


<!-- rename modal -->
<form class="modal" bind:this={chatNameSettings} on:submit={saveChatNameSettings}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-background" on:click={closeChatNameSettings} />
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Enter a new name for this chat</p>
    </header>
    <section class="modal-card-body">
      <div class="field is-horizontal">
        <div class="field-label is-normal">
          <label class="label" for="settings-chat-name">New name:</label>
        </div>
        <div class="field-body">
          <div class="field">
            <input
              class="input"
              type="text"
              id="settings-chat-name"
              value={chat.name}
            />
          </div>
        </div>
      </div>
    </section>
    <footer class="modal-card-foot">
      <input type="submit" class="button is-info" value="Save" />
      <button class="button" on:click={closeChatNameSettings}>Cancel</button>
    </footer>
  </div>
</form>
<!-- end -->
