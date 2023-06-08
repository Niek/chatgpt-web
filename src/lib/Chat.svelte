<script lang="ts">
  // This beast needs to be broken down into multiple components before it gets any worse.
  import {
    saveChatStore,
    apiKeyStorage,
    chatsStorage,
    addMessage,
    insertMessages,
    getChatSettingValueNullDefault,
    updateChatSettings,
    checkStateChange,
    showSetChatSettings,
    submitExitingPromptsNow,
    deleteMessage,
    continueMessage,
    getMessage
  } from './Storage.svelte'
  import { getRequestSettingList, defaultModel } from './Settings.svelte'
  import {
    type Request,
    type Message,
    type Chat,
    type ChatCompletionOpts
  } from './Types.svelte'
  import Prompts from './Prompts.svelte'
  import Messages from './Messages.svelte'
  import { prepareSummaryPrompt, restartProfile } from './Profiles.svelte'

  import { afterUpdate, onMount, onDestroy } from 'svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import {
    faArrowUpFromBracket,
    faPaperPlane,
    faGear,
    faPenToSquare,
    faMicrophone,
    faLightbulb,
    faCommentSlash
  } from '@fortawesome/free-solid-svg-icons/index'
  // import { encode } from 'gpt-tokenizer'
  import { v4 as uuidv4 } from 'uuid'
  import { countPromptTokens, getModelMaxTokens, getPrice } from './Stats.svelte'
  import { autoGrowInputOnEvent, scrollToMessage, sizeTextElements } from './Util.svelte'
  import ChatSettingsModal from './ChatSettingsModal.svelte'
  import Footer from './Footer.svelte'
  import { openModal } from 'svelte-modals'
  import PromptInput from './PromptInput.svelte'
  import { ChatCompletionResponse } from './ChatCompletionResponse.svelte'
  import { fetchEventSource } from '@microsoft/fetch-event-source'
  import { getApiBase, getEndpointCompletions } from './ApiUtil.svelte'

  export let params = { chatId: '' }
  const chatId: number = parseInt(params.chatId)

  let controller:AbortController = new AbortController()

  let updating: boolean|number = false
  let updatingMessage: string = ''
  let input: HTMLTextAreaElement
  let recognition: any = null
  let recording = false
  let lastSubmitRecorded = false

  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: chatSettings = chat.settings
  let showSettingsModal

  let scDelay
  const onStateChange = (...args:any) => {
    clearTimeout(scDelay)
    setTimeout(() => {
      if (chat.startSession) {
        restartProfile(chatId)
        if (chat.startSession) {
          chat.startSession = false
          saveChatStore()
          // Auto start the session
          submitForm(false, true)
        }
      }
      if ($showSetChatSettings) {
        $showSetChatSettings = false
        showSettingsModal()
      }
      if ($submitExitingPromptsNow) {
        $submitExitingPromptsNow = false
        submitForm(false, true)
      }
      if ($continueMessage) {
        const message = getMessage(chat, $continueMessage)
        $continueMessage = ''
        if (message && chat.messages.indexOf(message) === (chat.messages.length - 1)) {
          submitForm(lastSubmitRecorded, true, message)
        }
      }
    })
  }
  
  $: onStateChange($checkStateChange, $showSetChatSettings, $submitExitingPromptsNow, $continueMessage)

  // Make sure chat object is ready to go
  updateChatSettings(chatId)

  onDestroy(async () => {
    // clean up
    // abort any pending requests.
    controller.abort()
    ttsStop()
  })

  onMount(async () => {
    // Focus the input on mount
    focusInput()

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
    if (chat.startSession) {
      restartProfile(chatId)
      if (chat.startSession) {
        chat.startSession = false
        saveChatStore()
        // Auto start the session
        setTimeout(() => { submitForm(false, true) }, 0)
      }
    }
  })

  // Scroll to the bottom of the chat on update
  afterUpdate(() => {
    sizeTextElements()
    // Scroll to the bottom of the page after any updates to the messages array
    // focusInput()
  })

  // Scroll to the bottom of the chat on update
  const focusInput = () => {
    input.focus()
    scrollToBottom()
  }

  const scrollToBottom = (instant:boolean = false) => {
    setTimeout(() => document.querySelector('body')?.scrollIntoView({ behavior: (instant ? 'instant' : 'smooth') as any, block: 'end' }), 0)
  }

  // Send API request
  const sendRequest = async (messages: Message[], opts:ChatCompletionOpts): Promise<ChatCompletionResponse> => {
    // Show updating bar
    opts.chat = chat
    const chatResponse = new ChatCompletionResponse(opts)
    updating = true

    const model = chat.settings.model || defaultModel
    const maxTokens = getModelMaxTokens(model) // max tokens for model

    const messageFilter = (m:Message) => !m.suppress && m.role !== 'error' && m.content && !m.summarized

    // Submit only the role and content of the messages, provide the previous messages as well for context
    let filtered = messages.filter(messageFilter)
  
    // Get an estimate of the total prompt size we're sending
    const promptTokenCount:number = countPromptTokens(filtered, model)
  
    let summarySize = chatSettings.summarySize

    // console.log('Estimated',promptTokenCount,'prompt token for this request')

    if (chatSettings.continuousChat && !opts.didSummary &&
          !opts.summaryRequest && !opts.maxTokens &&
          promptTokenCount > chatSettings.summaryThreshold) {
      // Too many tokens -- well need to summarize some past ones else we'll run out of space
      // Get a block of past prompts we'll summarize
      let pinTop = chatSettings.pinTop
      const tp = chatSettings.trainingPrompts
      pinTop = Math.max(pinTop, tp ? 1 : 0)
      let pinBottom = chatSettings.pinBottom
      const systemPad = (filtered[0] || {} as Message).role === 'system' ? 1 : 0
      const mlen = filtered.length - systemPad // always keep system prompt
      let diff = mlen - (pinTop + pinBottom)
      const useFIFO = chatSettings.continuousChat === 'fifo' || !prepareSummaryPrompt(chatId, 0)
      if (!useFIFO) {
        while (diff <= 3 && (pinTop > 0 || pinBottom > 1)) {
          // Not enough prompts exposed to summarize
          // try to open up pinTop and pinBottom to see if we can get more to summarize
          if (pinTop === 1 && pinBottom > 1) {
            // If we have a pin top, try to keep some of it as long as we can
            pinBottom = Math.max(Math.floor(pinBottom / 2), 0)
          } else {
            pinBottom = Math.max(Math.floor(pinBottom / 2), 0)
            pinTop = Math.max(Math.floor(pinTop / 2), 0)
          }
          diff = mlen - (pinTop + pinBottom)
        }
      }
      if (!useFIFO && diff > 0) {
        // We've found at least one prompt we can try to summarize
        // Reduce to prompts we'll send in for summary
        // (we may need to update this to not include the pin-top, but the context it provides seems to help in the accuracy of the summary)
        const summarize = filtered.slice(0, filtered.length - pinBottom)
        // Estimate token count of what we'll be summarizing
        let sourceTokenCount = countPromptTokens(summarize, model)
        // build summary prompt message
        let summaryPrompt = prepareSummaryPrompt(chatId, sourceTokenCount)
  
        const summaryMessage = {
          role: 'user',
          content: summaryPrompt
        } as Message
        // get an estimate of how many tokens this request + max completions could be
        let summaryPromptSize = countPromptTokens(summarize.concat(summaryMessage), model)
        // reduce summary size to make sure we're not requesting a summary larger than our prompts
        summarySize = Math.floor(Math.min(summarySize, sourceTokenCount / 4))
        // Make sure our prompt + completion request isn't too large
        while (summarize.length - (pinTop + systemPad) >= 3 && summaryPromptSize + summarySize > maxTokens && summarySize >= 4) {
          summarize.pop()
          sourceTokenCount = countPromptTokens(summarize, model)
          summaryPromptSize = countPromptTokens(summarize.concat(summaryMessage), model)
          summarySize = Math.floor(Math.min(summarySize, sourceTokenCount / 4))
        }
        // See if we have to adjust our max summarySize
        if (summaryPromptSize + summarySize > maxTokens) {
          summarySize = maxTokens - summaryPromptSize
        }
        // Always try to end the prompts being summarized with a user prompt.  Seems to work better.
        while (summarize.length - (pinTop + systemPad) >= 4 && summarize[summarize.length - 1].role !== 'user') {
          summarize.pop()
        }
        // update with actual
        sourceTokenCount = countPromptTokens(summarize, model)
        summaryPrompt = prepareSummaryPrompt(chatId, sourceTokenCount)
        summarySize = Math.floor(Math.min(summarySize, sourceTokenCount / 4))
        summaryMessage.content = summaryPrompt
        if (sourceTokenCount > 20 && summaryPrompt && summarySize > 4) {
          // get prompt we'll be inserting after
          const endPrompt = summarize[summarize.length - 1]
          // Add a prompt to ask to summarize them
          const summarizeReq = summarize.slice()
          summarizeReq.push(summaryMessage)
          summaryPromptSize = countPromptTokens(summarizeReq, model)

          const summaryResponse:Message = {
            role: 'assistant',
            content: '',
            uuid: uuidv4(),
            streaming: opts.streaming,
            summary: []
          }
          summaryResponse.model = model

          // Insert summary prompt
          insertMessages(chatId, endPrompt, [summaryResponse])
          if (opts.streaming) setTimeout(() => scrollToMessage(summaryResponse.uuid, 150, true, true), 0)

          // Wait for the summary completion
          updatingMessage = 'Summarizing...'
          const summary = await sendRequest(summarizeReq, {
            summaryRequest: true,
            streaming: opts.streaming,
            maxTokens: summarySize,
            fillMessage: summaryResponse,
            autoAddMessages: true,
            onMessageChange: (m) => {
              if (opts.streaming) scrollToMessage(summaryResponse.uuid, 150, true, true)
            }
          } as ChatCompletionOpts)
          if (!summary.hasFinished()) await summary.promiseToFinish()
          if (summary.hasError()) {
            // Failed to some API issue. let the original caller handle it.
            deleteMessage(chatId, summaryResponse.uuid)
            return summary
          } else {
            // Looks like we got our summarized messages.
            // get ids of messages we summarized
            const summarizedIds = summarize.slice(pinTop + systemPad).map(m => m.uuid)
            // Mark the new summaries as such
            summaryResponse.summary = summarizedIds

            const summaryIds = [summaryResponse.uuid]
            // Disable the messages we summarized so they still show in history
            summarize.forEach((m, i) => {
              if (i - systemPad >= pinTop) {
                m.summarized = summaryIds
              }
            })
            saveChatStore()
            // Re-run request with summarized prompts
            // return { error: { message: "End for now" } } as Response
            updatingMessage = 'Continuing...'
            opts.didSummary = true
            return await sendRequest(chat.messages, opts)
          }
        } else if (!summaryPrompt) {
          addMessage(chatId, { role: 'error', content: 'Unable to summarize. No summary prompt defined.', uuid: uuidv4() })
        } else if (sourceTokenCount <= 20) {
          addMessage(chatId, { role: 'error', content: 'Unable to summarize. Not enough words in past content to summarize.', uuid: uuidv4() })
        }
      } else if (!useFIFO && diff < 1) {
        addMessage(chatId, { role: 'error', content: 'Unable to summarize. Not enough messages in past content to summarize.', uuid: uuidv4() })
      } else {
        // roll-off/fifo mode
        const top = filtered.slice(0, pinTop + systemPad)
        const rollaway = filtered.slice(pinTop + systemPad)
        let promptTokenCount = countPromptTokens(top.concat(rollaway), model)
        // suppress messages we're rolling off
        while (rollaway.length > (((promptTokenCount + (chatSettings.max_tokens || 1)) > maxTokens) ? pinBottom || 1 : 1) &&
            promptTokenCount >= chatSettings.summaryThreshold) {
          const rollOff = rollaway.shift()
          if (rollOff) rollOff.suppress = true
          promptTokenCount = countPromptTokens(top.concat(rollaway), model)
        }
        saveChatStore()
        // get a new list now excluding them
        filtered = messages.filter(messageFilter)
      }
    }

    try {
      const request: Request = {
        messages: filtered.map(m => { return { role: m.role, content: m.content } }) as Message[],

        // Provide the settings by mapping the settingsMap to key/value pairs
        ...getRequestSettingList().reduce((acc, setting) => {
          const key = setting.key
          let value = getChatSettingValueNullDefault(chatId, setting)
          if (typeof setting.apiTransform === 'function') {
            value = setting.apiTransform(chatId, setting, value)
          }
          if (opts.summaryRequest && opts.maxTokens) {
            // requesting summary. do overrides
            if (key === 'max_tokens') value = opts.maxTokens // only as large as we need for summary
            if (key === 'n') value = 1 // never more than one completion for summary
          }
          if (opts.streaming) {
            /*
            Streaming goes insane with more than one completion.
            Doesn't seem like there's any way to separate the jumbled mess of deltas for the
            different completions.
            */
            if (key === 'n') value = 1
          }
          if (value !== null) acc[key] = value
          return acc
        }, {})
      }

      request.stream = opts.streaming

      chatResponse.setPromptTokenCount(promptTokenCount)

      const signal = controller.signal

      const fetchOptions = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${$apiKeyStorage}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal
      }

      // fetchEventSource doesn't seem to throw on abort, so...
      const abortListener = (e:Event) => {
        controller = new AbortController()
        chatResponse.updateFromError('User aborted request.')
        signal.removeEventListener('abort', abortListener)
      }
      signal.addEventListener('abort', abortListener)

      if (opts.streaming) {
        chatResponse.onFinish(() => {
          updating = false
          updatingMessage = ''
          scrollToBottom()
        })
        fetchEventSource(getApiBase() + getEndpointCompletions(), {
          ...fetchOptions,
          openWhenHidden: true,
          onmessage (ev) {
            // Remove updating indicator
            updating = 1 // hide indicator, but still signal we're updating
            updatingMessage = ''
            // console.log('ev.data', ev.data)
            if (!chatResponse.hasFinished()) {
              if (ev.data === '[DONE]') {
                // ?? anything to do when "[DONE]"?
              } else {
                const data = JSON.parse(ev.data)
                // console.log('data', data)
                window.requestAnimationFrame(() => { chatResponse.updateFromAsyncResponse(data) })
              }
            }
          },
          onclose () {
            chatResponse.updateFromClose()
          },
          onerror (err) {
            console.error(err)
            throw err
          }
        }).catch(err => {
          chatResponse.updateFromError(err.message)
          scrollToBottom()
        })
      } else {
        const response = await fetch(getApiBase() + getEndpointCompletions(), fetchOptions)
        const json = await response.json()
  
        // Remove updating indicator
        updating = false
        updatingMessage = ''
        chatResponse.updateFromSyncResponse(json)
        scrollToBottom()
      }
    } catch (e) {
      console.error(e)
      updating = false
      updatingMessage = ''
      chatResponse.updateFromError(e.message)
      scrollToBottom()
    }

    return chatResponse
  }

  const addNewMessage = () => {
    if (updating) return
    let inputMessage: Message
    const lastMessage = chat.messages[chat.messages.length - 1]
    const uuid = uuidv4()
    if (chat.messages.length === 0) {
      inputMessage = { role: 'system', content: input.value, uuid }
    } else if (lastMessage && lastMessage.role === 'user') {
      inputMessage = { role: 'assistant', content: input.value, uuid }
    } else {
      inputMessage = { role: 'user', content: input.value, uuid }
    }
    addMessage(chatId, inputMessage)

    // Clear the input value
    input.value = ''
    // input.blur()
    focusInput()
  }

  const ttsStart = (text:string, recorded:boolean) => {
    // Use TTS to read the response, if query was recorded
    if (recorded && 'SpeechSynthesisUtterance' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
    }
  }

  const ttsStop = () => {
    // Use TTS to read the response, if query was recorded
    if ('SpeechSynthesisUtterance' in window) {
      window.speechSynthesis.cancel()
    }
  }

  const submitForm = async (recorded: boolean = false, skipInput: boolean = false, fillMessage: Message|undefined = undefined): Promise<void> => {
    // Compose the system prompt message if there are no messages yet - disabled for now
    if (updating) return

    lastSubmitRecorded = recorded
  
    if (!skipInput) {
      chat.sessionStarted = true
      saveChatStore()
      if (input.value !== '') {
        // Compose the input message
        const inputMessage: Message = { role: 'user', content: input.value, uuid: uuidv4() }
        addMessage(chatId, inputMessage)
      } else if (!fillMessage && chat.messages.length && chat.messages[chat.messages.length - 1].finish_reason === 'length') {
        fillMessage = chat.messages[chat.messages.length - 1]
      }

      if (fillMessage && fillMessage.content) fillMessage.content += ' ' // add a space

      // Clear the input value
      input.value = ''
      input.blur()
  
      // Resize back to single line height
      input.style.height = 'auto'
    }
    focusInput()

    const response = await sendRequest(chat.messages, {
      chat,
      autoAddMessages: true, // Auto-add and update messages in array
      streaming: chatSettings.stream,
      fillMessage,
      onMessageChange: (messages) => {
        scrollToBottom(true)
      }
    })
    await response.promiseToFinish()
    const message = response.getMessages()[0]
    if (message) {
      ttsStart(message.content, recorded)
    }
    focusInput()
  }

  const suggestName = async (): Promise<void> => {
    const suggestMessage: Message = {
      role: 'user',
      content: "Can you give me a 5 word summary of this conversation's topic?",
      uuid: uuidv4()
    }

    const suggestMessages = chat.messages.slice(0, 10) // limit to first 10 messages
    suggestMessages.push(suggestMessage)

    const response = await sendRequest(suggestMessages, {
      chat,
      autoAddMessages: false,
      streaming: false
    })
    await response.promiseToFinish()

    if (response.hasError()) {
      addMessage(chatId, {
        role: 'error',
        content: `Unable to get suggested name: ${response.getError()}`,
        uuid: uuidv4()
      })
    } else {
      response.getMessages().forEach(m => {
        chat.name = m.content
      })
    }
  }

  function promptRename () {
    openModal(PromptInput, {
      title: 'Enter Name for Chat',
      label: 'Name',
      value: chat.name,
      class: 'is-info',
      onSubmit: (value) => {
        chat.name = (value || '').trim() || chat.name
        saveChatStore()
        $checkStateChange++
      }
    })
  }

  const recordToggle = () => {
    ttsStop()
    if (updating) return
    // Check if already recording - if so, stop - else start
    if (recording) {
      recognition?.stop()
      recording = false
    } else {
      recognition?.start()
    }
  }

</script>

<ChatSettingsModal chatId={chatId} bind:show={showSettingsModal} />

<div class="chat-content">
<nav class="level chat-header">
  <div class="level-left">
    <div class="level-item">
      <p class="subtitle is-5">
        <span>{chat.name || `Chat ${chat.id}`}</span>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Rename chat" on:click|preventDefault={promptRename}><Fa icon={faPenToSquare} /></a>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Suggest a chat name" on:click|preventDefault={suggestName}><Fa icon={faLightbulb} /></a>
        <!-- <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Copy this chat" on:click|preventDefault={() => { copyChat(chatId) }}><Fa icon={faClone} /></a> -->
        <!-- <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Delete this chat" on:click|preventDefault={deleteChat}><Fa icon={faTrash} /></a> -->
      </p>
    </div>
  </div>

  <div class="level-right">
    <div class="level-item">
      <!-- <button class="button is-warning" on:click={() => { clearMessages(chatId); window.location.reload() }}><span class="greyscale mr-2"><Fa icon={faTrash} /></span> Clear messages</button> -->
    </div>
  </div>
</nav>

<Messages messages={chat.messages} chatId={chatId} />

{#if updating === true}
  <article class="message is-success assistant-message">
    <div class="message-body content">
      <span class="is-loading" ></span>
      <span>{updatingMessage}</span>
    </div>
  </article>
{/if}

{#if chat.messages.length === 0 || (chat.messages.length === 1 && chat.messages[0].role === 'system')}
  <Prompts bind:input />
{/if}
</div>
<Footer class="prompt-input-container" strongMask={true}>
  <form class="field has-addons has-addons-right is-align-items-flex-end" on:submit|preventDefault={() => submitForm()}>
    <p class="control is-expanded">
      <textarea
        class="input is-info is-focused chat-input auto-size"
        placeholder="Type your message here..."
        rows="1"
        on:keydown={e => {
          // Only send if Enter is pressed, not Shift+Enter
          if (e.key === 'Enter' && !e.shiftKey) {
            e.stopPropagation()
            submitForm()
            e.preventDefault()
          }
        }}
        on:input={e => autoGrowInputOnEvent(e)}
        bind:this={input}
      />
    </p>
    <p class="control mic" class:is-hidden={!recognition}>
      <button class="button" class:is-disabled={updating} class:is-pulse={recording} on:click|preventDefault={recordToggle}
        ><span class="icon"><Fa icon={faMicrophone} /></span></button
      >
    </p>
    <p class="control settings">
      <button title="Chat/Profile Settings" class="button" on:click|preventDefault={showSettingsModal}><span class="icon"><Fa icon={faGear} /></span></button>
    </p>
    <p class="control queue">
      <button title="Queue message, don't send yet" class:is-disabled={updating} class="button is-ghost" on:click|preventDefault={addNewMessage}><span class="icon"><Fa icon={faArrowUpFromBracket} /></span></button>
    </p>
    {#if updating}
    <p class="control send">
      <button title="Cancel Response" class="button is-danger" type="button" on:click={() => { controller.abort() }}><span class="icon"><Fa icon={faCommentSlash} /></span></button>
    </p>
    {:else}
    <p class="control send">
      <button title="Send" class="button is-info" type="submit"><span class="icon"><Fa icon={faPaperPlane} /></span></button>
    </p>
    {/if}
  </form>
  <!-- a target to scroll to -->
  <div class="content has-text-centered running-total-container">
    {#each Object.entries(chat.usage || {}) as [model, usage]}
    <p class="is-size-7 running-totals">
      <em>{model}</em> total <span class="has-text-weight-bold">{usage.total_tokens}</span>
      tokens ~= <span class="has-text-weight-bold">${getPrice(usage, model).toFixed(6)}</span>
    </p>
    {/each}
  </div>
</Footer>
