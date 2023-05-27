<script lang="ts">
  // This beast needs to be broken down into multiple components before it gets any worse.
  import {
    saveChatStore,
    apiKeyStorage,
    chatsStorage,
    globalStorage,
    addMessage,
    insertMessages,
    clearMessages,
    copyChat,
    getChatSettingValue,
    getChatSettingValueByKey,
    setChatSettingValue,
    getChatSettingValueNullDefault,
    setChatSettingValueByKey,
    saveCustomProfile,
    deleteCustomProfile,
    setGlobalSettingValueByKey
  } from './Storage.svelte'
  import { getChatSettingByKey, getChatSettingList } from './Settings.svelte'
  import {
    type Request,
    type Response,
    type Message,
    type ChatSetting,
    type ResponseModels,
    type SettingSelect,
    type Chat,
    type SelectOption,
    supportedModels,
    type ChatSettings
  } from './Types.svelte'
  import Prompts from './Prompts.svelte'
  import Messages from './Messages.svelte'
  import { applyProfile, checkSessionActivity, getProfile, getProfileSelect, prepareSummaryPrompt } from './Profiles.svelte'

  import { afterUpdate, onMount } from 'svelte'
  import { replace } from 'svelte-spa-router'
  import Fa from 'svelte-fa/src/fa.svelte'
  import {
    faArrowUpFromBracket,
    faPaperPlane,
    faGear,
    faPenToSquare,
    faTrash,
    faMicrophone,
    faLightbulb,
    faClone,
    faEllipsisVertical,
    faFloppyDisk,
    faThumbtack,
    faDownload,
    faUpload
  } from '@fortawesome/free-solid-svg-icons/index'
  import { encode } from 'gpt-tokenizer'
  import { v4 as uuidv4 } from 'uuid'
  import { exportProfileAsJSON } from './Export.svelte'

  // This makes it possible to override the OpenAI API base URL in the .env file
  const apiBase = import.meta.env.VITE_API_BASE || 'https://api.openai.com'

  export let params = { chatId: '' }
  const chatId: number = parseInt(params.chatId)

  let updating: boolean = false
  let updatingMessage: string = ''
  let input: HTMLTextAreaElement
  // let settings: HTMLDivElement
  let chatNameSettings: HTMLFormElement
  let recognition: any = null
  let recording = false
  let profileFileInput
  let showSettingsModal = 0
  let showProfileMenu = false

  const settingsList = getChatSettingList()
  const modelSetting = getChatSettingByKey('model') as ChatSetting & SettingSelect

  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: globalStore = $globalStorage

  onMount(async () => {
    // Sanitize old save
    if (!chat.settings) chat.settings = {} as ChatSettings
    // make sure old chat has UUID
    if (chat && chat.messages && chat.messages[0] && !chat.messages[0].uuid) {
      chat.messages.forEach((m) => {
        m.uuid = uuidv4()
      })
      saveChatStore()
    }

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
    if (!chat.settings.profile) {
      const profile = getProfile('') // get default profile
      applyProfile(chatId, profile.profile as any)
      if (getChatSettingValueByKey(chatId, 'startSession')) {
        setChatSettingValueByKey(chatId, 'startSession', false)
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
    setTimeout(() => document.querySelector('.chat-focus-point')?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0)
  }

  // Send API request
  const sendRequest = async (messages: Message[], doingSummary?:boolean, withSummary?:boolean): Promise<Response> => {
    // Show updating bar
    updating = true
    updatingMessage = ''

    let response: Response

    // Submit only the role and content of the messages, provide the previous messages as well for context
    const filtered = messages.filter((message) => message.role !== 'error' && message.content && !message.summarized)
  
    // Get an estimate of the total prompt size we're sending
    const promptTokenCount:number = filtered.reduce((a, m) => {
      a += encode(m.content).length + 8 // + 8, always seems to under count by around 8
      return a
    }, 0)

    if (getChatSettingValueByKey(chatId, 'useSummarization') &&
          !withSummary && !doingSummary &&
          (promptTokenCount > getChatSettingValueByKey(chatId, 'summaryThreshold'))) {
      // Too many tokens -- well need to sumarize some past ones else we'll run out of space
      // Get a block of past prompts we'll summarize
      let pinTop = getChatSettingValueByKey(chatId, 'pinTop')
      const tp = getChatSettingValueByKey(chatId, 'trainingPrompts')
      pinTop = Math.max(pinTop, tp || 0)
      let pinBottom = getChatSettingValueByKey(chatId, 'pinBottom')
      const systemPad = (filtered[0] || {} as Message).role === 'system' ? 1 : 0
      const mlen = filtered.length - systemPad // always keep system prompt
      let diff = mlen - (pinTop + pinBottom)
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
      if (diff > 0) {
        // We've found at least one prompt we can try to summarize
        // Reduce to prompts we'll send in for summary
        // (we may need to update this to not include the pin-top, but the context it provides seems to help in the accuracy of the summary)
        const summarize = filtered.slice(0, filtered.length - pinBottom)
        // Always try to end the prompts being summarized with a user prompt.  Seems to work better.
        while (summarize.length - (pinTop + systemPad) >= 4 && summarize[summarize.length - 1].role !== 'user') {
          summarize.pop()
        }
        // Estimate token count of what we'll be summarizing
        const sourceTokenCount = summarize.reduce((a, m) => { a += encode(m.content).length + 8; return a }, 0)
  
        const summaryPrompt = prepareSummaryPrompt(chatId, sourceTokenCount)
        if (sourceTokenCount > 20 && summaryPrompt) {
          // get prompt we'll be inserting after
          const endPrompt = summarize[summarize.length - 1]
          // Add a prompt to ask to summarize them
          const summarizeReq = summarize.slice()
          summarizeReq.push({
            role: 'user',
            content: summaryPrompt
          } as Message)
          // Wait for the summary completion
          const summary = await sendRequest(summarizeReq, true)
          if (summary.error) {
            // Failed to some API issue. let the original caller handle it.
            return summary
          } else {
            // See if we can parse the results
            // (Make sure AI generated a good JSON response)
            const summaryPromptContent: string = summary.choices.reduce((a, c) => {
              if (a.length > c.message.content.length) return a
              a = c.message.content
              return a
            }, '')
            // Looks like we got our summarized messages.
            // get ids of messages we summarized
            const summarizedIds = summarize.slice(pinTop + systemPad).map(m => m.uuid)
            // Mark the new summaries as such
            const summaryPrompt:Message = {
              role: 'assistant',
              content: summaryPromptContent,
              uuid: uuidv4(),
              summary: summarizedIds
            }
            const summaryIds = [summaryPrompt.uuid]
            // Insert messages
            insertMessages(chatId, endPrompt, [summaryPrompt])
            // Disable the messages we summarized so they still show in history
            summarize.forEach((m, i) => {
              if (i - systemPad >= pinTop) {
                m.summarized = summaryIds
              }
            })
            saveChatStore()
            // Re-run request with summarized prompts
            // return { error: { message: "End for now" } } as Response
            return await sendRequest(chat.messages, false, true)
          }
        } else if (!summaryPrompt) {
          addMessage(chatId, { role: 'error', content: 'Unable to summarize. No summary prompt defined.', uuid: uuidv4() })
        } else if (sourceTokenCount <= 20) {
          addMessage(chatId, { role: 'error', content: 'Unable to summarize. Not enough words in past content to summarize.', uuid: uuidv4() })
        }
      } else {
        addMessage(chatId, { role: 'error', content: 'Unable to summarize. Not enough messages in past content to summarize.', uuid: uuidv4() })
      }
    }

    try {
      const request: Request = {
        messages: filtered.map(m => { return { role: m.role, content: m.content } }) as Message[],

        // Provide the settings by mapping the settingsMap to key/value pairs
        ...getChatSettingList().reduce((acc, setting) => {
          if (setting.noRequest) return acc // don't include non-request settings
          let value = getChatSettingValueNullDefault(chatId, setting)
          if (value === null && setting.required) value = setting.default
          if (doingSummary && setting.key === 'max_tokens') {
            // Override for summary
            value = getChatSettingValueByKey(chatId, 'summarySize')
          }
          if (value !== null) acc[setting.key] = value
          return acc
        }, {})
      }

      // Not working yet: a way to get the response as a stream
      /*
      request.stream = true
      await fetchEventSource(apiBase + '/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization:
          `Bearer ${$apiKeyStorage}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        onmessage (ev) {
          const data = JSON.parse(ev.data)
          console.log(data)
        },
        onerror (err) {
          throw err
        }
      })
      */

      response = await (
        await fetch(apiBase + '/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${$apiKeyStorage}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        })
      ).json()
    } catch (e) {
      response = { error: { message: e.message } } as Response
    }

    // Hide updating bar
    updating = false
    updatingMessage = ''

    if (!response.error) {
      // tc.completions++
      // tc.completionsTokens += response.usage.completion_tokens
      // chat.totals.push(tc)
      // console.log('got response:', response)
    }

    return response
  }

  const addNewMessage = () => {
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

  const submitForm = async (recorded: boolean = false, skipInput: boolean = false): Promise<void> => {
    // Compose the system prompt message if there are no messages yet - disabled for now
    if (updating) return
  
    if (!skipInput) {
      if (input.value !== '') {
        // Compose the input message
        const inputMessage: Message = { role: 'user', content: input.value, uuid: uuidv4() }
        addMessage(chatId, inputMessage)
      }

      // Clear the input value
      input.value = ''
      input.blur()
  
      // Resize back to single line height
      input.style.height = 'auto'
    }
    focusInput()

    const response = await sendRequest(chat.messages)

    if (response.error) {
      addMessage(chatId, {
        role: 'error',
        content: `Error: ${response.error.message}`,
        uuid: uuidv4()
      })
    } else {
      response.choices.forEach((choice) => {
        // Store usage and model in the message
        choice.message.usage = response.usage
        choice.message.model = response.model
  
        // Remove whitespace around the message that the OpenAI API sometimes returns
        choice.message.content = choice.message.content.trim()
        addMessage(chatId, choice.message)
        // Use TTS to read the response, if query was recorded
        if (recorded && 'SpeechSynthesisUtterance' in window) {
          const utterance = new SpeechSynthesisUtterance(choice.message.content)
          window.speechSynthesis.speak(utterance)
        }
      })
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

    const response = await sendRequest(suggestMessages, true)

    if (response.error) {
      addMessage(chatId, {
        role: 'error',
        content: `Unable to get suggested name: ${response.error.message}`,
        uuid: uuidv4()
      })
    } else {
      response.choices.forEach((choice) => {
        chat.name = choice.message.content
      })
    }
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

  const updateProfileSelectOptions = () => {
    const profileSelect = getChatSettingByKey('profile') as ChatSetting & SettingSelect
    const defaultProfile = getProfile('')
    profileSelect.default = defaultProfile.profile as any
    profileSelect.options = getProfileSelect()
  }

  const showSettings = async () => {
    // Show settings modal
    showSettingsModal++

    // Get profile options
    updateProfileSelectOptions()

    // Refresh settings modal
    showSettingsModal++
  
    // Load available models from OpenAI
    const allModels = (await (
      await fetch(apiBase + '/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${$apiKeyStorage}`,
          'Content-Type': 'application/json'
        }
      })
    ).json()) as ResponseModels
    const filteredModels = supportedModels.filter((model) => allModels.data.find((m) => m.id === model))

    const modelOptions:SelectOption[] = filteredModels.reduce((a, m) => {
      const o:SelectOption = {
        value: m,
        text: m
      }
      a.push(o)
      return a
    }, [] as SelectOption[])

    // Update the models in the settings
    if (modelSetting) {
      modelSetting.options = modelOptions
    }
    // Refresh settings modal
    showSettingsModal++

    setTimeout(() => sizeTextElements, 100)
  }

  const sizeTextElements = () => {
    const els = document.querySelectorAll('textarea.auto-size')
    for (let i:number = 0, l = els.length; i < l; i++) autoGrowInput(els[i] as HTMLTextAreaElement)
  }

  const closeSettings = () => {
    showSettingsModal = 0
    showProfileMenu = false
    if (chat.settings.startSession) {
      setChatSettingValueByKey(chatId, 'startSession', false)
      submitForm(false, true)
    }
  }

  const clearSettings = () => {
    settingsList.forEach(s => {
      setChatSettingValue(chatId, s, null)
    })
    showSettingsModal++ // Make sure the dialog updates
    // const input = settings.querySelector(`#settings-${setting.key}`) as HTMLInputElement
    // saveSetting(chatId, setting, null)
    // input.value = ''
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

  const debounce = {}

  const queueSettingValueChange = (event: Event, setting: ChatSetting) => {
    clearTimeout(debounce[setting.key])
    if (event.target === null) return
    const el = (event.target as HTMLInputElement)
    const doSet = () => {
      switch (setting.type) {
        case 'boolean':
          setChatSettingValue(chatId, setting, el.checked)
          showSettingsModal && showSettingsModal++
          break
        default:
          setChatSettingValue(chatId, setting, el.value)
      }
      (typeof setting.afterChange === 'function') && setting.afterChange(chatId, setting) 
        && showSettingsModal && showSettingsModal++
    }
    if (setting.key === 'profile' && checkSessionActivity(chatId) 
      && (getProfile(el.value).characterName !== getChatSettingValueByKey(chatId,'characterName'))) {
      const val = getChatSettingValue(chatId, setting)
      if (window.confirm('Personality change will not correctly apply to existing chat session.\n Continue?')) {
        doSet()
      } else {
        // roll-back
        setChatSettingValue(chatId, setting, val)
        // refresh setting modal, if open
        showSettingsModal && showSettingsModal++
      }
    }
    debounce[setting.key] = setTimeout(doSet, 250)
  }
  const autoGrowInputOnEvent = (event: Event) => {
    // Resize the textarea to fit the content - auto is important to reset the height after deleting content
    if (event.target === null) return
    autoGrowInput(event.target as HTMLTextAreaElement)
  }

  const autoGrowInput = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  const saveProfile = () => {
    showProfileMenu = false
    try {
      saveCustomProfile(chat.settings)
    } catch (e) {
      alert('Error saving profile: \n' + e.message)
    }
  }

  const newNameForProfile = (name:string):string => {
    const profiles = getProfileSelect()
    const nameMap = profiles.reduce((a, p) => { a[p.text] = p; return a }, {})
    if (!nameMap[name]) return name
    let i:number = 1
    let cname = name + `-${i}`
    while (nameMap[cname]) {
      i++
      cname = name + `-${i}`
    }
    return cname
  }

  const cloneProfile = () => {
    showProfileMenu = false
    const clone = JSON.parse(JSON.stringify(chat.settings))
    const name = chat.settings.profileName
    clone.profileName = newNameForProfile(name || '')
    clone.profile = null
    try {
      saveCustomProfile(clone)
      chat.settings.profile = clone.profile
      chat.settings.profileName = clone.profileName
      updateProfileSelectOptions()
      showSettingsModal && showSettingsModal++
    } catch (e) {
      alert('Error cloning profile: \n' + e.message)
    }
  }

  const deleteProfile = () => {
    showProfileMenu = false
    try {
      deleteCustomProfile(chatId, chat.settings.profile as any)
      chat.settings.profile = globalStore.defaultProfile
      saveChatStore()
      setGlobalSettingValueByKey('lastProfile', chat.settings.profile)
      applyProfile(chatId, chat.settings.profile as any)
      updateProfileSelectOptions()
      showSettings()
    } catch (e) {
      alert('Error deleting profile: \n' + e.message)
    }
  }

  const pinDefaultProfile = () => {
    showProfileMenu = false
    setGlobalSettingValueByKey('defaultProfile', chat.settings.profile)
  }

  const importProfileFromFile = (e) => {
    const image = e.target.files[0]
    const reader = new FileReader()
    reader.readAsText(image)
    reader.onload = e => {
      const json = (e.target || {}).result as string
      try {
        const profile = JSON.parse(json)
        profile.profileName = newNameForProfile(profile.profileName || '')
        profile.profile = null
        saveCustomProfile(profile)
        updateProfileSelectOptions()
        showSettingsModal && showSettingsModal++
      } catch (e) {
        alert('Unable to import profile: \n' + e.message)
      }
    }
  }
</script>

<nav class="level chat-header">
  <div class="level-left">
    <div class="level-item">
      <p class="subtitle is-5">
        {chat.name || `Chat ${chat.id}`}
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Rename chat" on:click|preventDefault={showChatNameSettings}><Fa icon={faPenToSquare} /></a>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Suggest a chat name" on:click|preventDefault={suggestName}><Fa icon={faLightbulb} /></a>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Delete this chat" on:click|preventDefault={deleteChat}><Fa icon={faTrash} /></a>
        <a href={'#'} class="greyscale ml-2 is-hidden has-text-weight-bold editbutton" title="Copy this chat" on:click|preventDefault={() => { copyChat(chatId) }}><Fa icon={faClone} /></a>
      </p>
    </div>
  </div>

  <div class="level-right">
    <p class="level-item">
      {#if chat.settings.autoStartSession && chat.settings.systemPrompt && chat.settings.useSystemPrompt}
        
      {/if}
      <button class="button is-warning" on:click={() => { clearMessages(chatId); window.location.reload() }}><span class="greyscale mr-2"><Fa icon={faTrash} /></span> Clear messages</button>
    </p>
  </div>
</nav>

<Messages messages={chat.messages} chatId={chatId} />

{#if updating}
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

<form class="field has-addons has-addons-right is-align-items-flex-end" on:submit|preventDefault={() => submitForm()}>
  <p class="control is-expanded">
    <textarea
      class="input is-info is-focused chat-input auto-size"
      placeholder="Type your message here..."
      rows="1"
      on:keydown={e => {
        // Only send if Enter is pressed, not Shift+Enter
        if (e.key === 'Enter' && !e.shiftKey) {
          submitForm()
          e.preventDefault()
        }
      }}
      on:input={e => autoGrowInputOnEvent(e)}
      bind:this={input}
    />
  </p>
  <p class="control" class:is-hidden={!recognition}>
    <button class="button" class:is-pulse={recording} on:click|preventDefault={recordToggle}
      ><span class="greyscale"><Fa icon={faMicrophone} /></span></button
    >
  </p>
  <p class="control">
    <button title="Chat/Profile Settings" class="button" on:click|preventDefault={showSettings}><Fa icon={faGear} /></button>
  </p>
  <p class="control">
    <button title="Add message, don't send yet" class="button is-ghost" on:click|preventDefault={addNewMessage}><Fa icon={faArrowUpFromBracket} /></button>
  </p>
  <p class="control">
    <button title="Send" class="button is-info" type="submit"><Fa icon={faPaperPlane} /></button>
  </p>
</form>
<div class="chat-focus-point" style="height.4em"></div>

<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') {
      closeSettings()
      closeChatNameSettings()
    }
  }}
/>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal" class:is-active={showSettingsModal}>
  <div class="modal-background" on:click={closeSettings} />
  <div class="modal-card" on:click={() => { showProfileMenu = false }}>
    <header class="modal-card-head">
      <p class="modal-card-title">Chat Settings</p>

      <div class="dropdown is-right" class:is-active={showProfileMenu}>
        <div class="dropdown-trigger">
          <button class="button" aria-haspopup="true" aria-controls="dropdown-menu3" on:click|preventDefault|stopPropagation={() => { showProfileMenu = !showProfileMenu }}>
            <span><Fa icon={faEllipsisVertical}/></span>
          </button>
        </div>
        <div class="dropdown-menu" id="dropdown-menu3" role="menu">
          <div class="dropdown-content">
            <a href={'#'} class="dropdown-item disabled" on:click|preventDefault={saveProfile}>
              <span><Fa icon={faFloppyDisk}/></span> Save Profile
            </a>
            <a href={'#'} class="dropdown-item" on:click|preventDefault={cloneProfile}>
              <span><Fa icon={faClone}/></span> Clone Profile
            </a>
            <hr class="dropdown-divider">
            <a href={'#'} 
              class="dropdown-item"
              on:click|preventDefault={() => { showProfileMenu = false; exportProfileAsJSON(chatId) }}
            >
              <span><Fa icon={faDownload}/></span> Export Profile
            </a>
            <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { showProfileMenu = false; profileFileInput.click() }}>
              <span><Fa icon={faUpload}/></span> Import Profile
            </a>
            <input style="display:none" type="file" accept=".json" on:change={(e) => importProfileFromFile(e)} bind:this={profileFileInput} >
            <hr class="dropdown-divider">
            <a href={'#'} class="dropdown-item" on:click|preventDefault={pinDefaultProfile}>
              <span><Fa icon={faThumbtack}/></span> Set as Default Profile
            </a>
            <hr class="dropdown-divider">
            <a href={'#'} class="dropdown-item" on:click|preventDefault={deleteProfile}>
              <span><Fa icon={faTrash}/></span> Delete Profile
            </a>
          </div>
        </div>
      </div>
    </header>
    <section class="modal-card-body">
      <!-- Below are the settings that OpenAI allows to be changed for the API calls. See the <a href="https://platform.openai.com/docs/api-reference/chat/create">OpenAI API docs</a> for more details.</p> -->
      {#key showSettingsModal}
      {#each settingsList as setting}
        {#if (typeof setting.hide !== 'function') || !setting.hide(chatId)}
        {#if setting.header}
        <p class="notification {setting.headerClass}">
          {@html setting.header}
        </p>
        {/if}
        <div class="field is-horizontal">
          {#if setting.type === 'boolean'}
          <div class="field is-normal">
            <label class="label" for="settings-{setting.key}" title="{setting.title}">
              <input 
              type="checkbox"
              title="{setting.title}"
              class="checkbox" 
              id="settings-{setting.key}"
              checked={getChatSettingValue(chatId, setting)} 
              on:click={e => queueSettingValueChange(e, setting)}
            >
              {setting.name}
            </label>
          </div>
          {:else if setting.type === 'textarea'}
          <div class="field is-normal" style="width:100%">
            <label class="label" for="settings-{setting.key}" title="{setting.title}">{setting.name}</label>
            <textarea
              class="input is-info is-focused chat-input auto-size"
              placeholder={setting.placeholder || ''}
              rows="1"
              on:input={e => autoGrowInputOnEvent(e)}
              on:change={e => { queueSettingValueChange(e, setting); autoGrowInputOnEvent(e) }}
            >{getChatSettingValue(chatId, setting)}</textarea>
          </div>
          {:else}
          <div class="field-label is-normal">
            <label class="label" for="settings-{setting.key}" title="{setting.title}">{setting.name}</label>
          </div>
          {/if}
          <div class="field-body">
            <div class="field">
              {#if setting.type === 'number'}
                <input
                  class="input"
                  inputmode="decimal"
                  type={setting.type}
                  title="{setting.title}"
                  id="settings-{setting.key}"
                  value="{getChatSettingValue(chatId, setting)}"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  placeholder={String(setting.default)}
                  on:change={e => queueSettingValueChange(e, setting)}
                />
              {:else if setting.type === 'select'}
                <div class="select">
                  <select id="settings-{setting.key}" title="{setting.title}" on:change={e => queueSettingValueChange(e, setting) } >
                    {#each setting.options as option}
                      <option value={option.value} selected={option.value === getChatSettingValue(chatId, setting)}>{option.text}</option>
                    {/each}
                  </select>
                </div>
              {:else if setting.type === 'text'}
                <div class="field">
                    <input 
                    type="text"
                    title="{setting.title}"
                    class="input" 
                    value={getChatSettingValue(chatId, setting)} 
                    on:change={e => { queueSettingValueChange(e, setting) }}
                  >
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
      {/each}
      {/key}
    </section>

    <footer class="modal-card-foot">
      <button class="button is-info" on:click={closeSettings}>Close settings</button>
      <button class="button" on:click={clearSettings}>Clear settings</button>
    </footer>
  </div>
</div>

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
