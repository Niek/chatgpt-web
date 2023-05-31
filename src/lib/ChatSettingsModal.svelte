<script lang="ts">
  import { applyProfile, getDefaultProfileKey, getProfile, getProfileSelect } from './Profiles.svelte'
  import { getChatDefaults, getChatSettingList, getChatSettingObjectByKey } from './Settings.svelte'
  import {
    saveChatStore,
    apiKeyStorage,
    chatsStorage,
    globalStorage,
    saveCustomProfile,
    deleteCustomProfile,
    setGlobalSettingValueByKey,
    resetChatSettings,
    setChatSettingValue,
    checkStateChange
  } from './Storage.svelte'
  import { supportedModels, type Chat, type ChatSetting, type ResponseModels, type SettingSelect, type SelectOption } from './Types.svelte'
  import { sizeTextElements, autoGrowInputOnEvent } from './Util.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import {
    faTrash,
    faClone,
    faEllipsisVertical,
    faFloppyDisk,
    faThumbtack,
    faDownload,
    faUpload
  } from '@fortawesome/free-solid-svg-icons/index'
  import { exportProfileAsJSON } from './Export.svelte'
  import { afterUpdate } from 'svelte'

  export let chatId:number
  export const show = () => { showSettings() }

  // This makes it possible to override the OpenAI API base URL in the .env file
  const apiBase = import.meta.env.VITE_API_BASE || 'https://api.openai.com'
  
  let showSettingsModal = 0
  let showProfileMenu:boolean = false
  let profileFileInput

  const settingsList = getChatSettingList()
  const modelSetting = getChatSettingObjectByKey('model') as ChatSetting & SettingSelect
  const chatDefaults = getChatDefaults()

  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: chatSettings = chat.settings
  $: globalStore = $globalStorage

  afterUpdate(() => {
    sizeTextElements()
  })
  
  const closeSettings = () => {
    showProfileMenu = false
    $checkStateChange++
    showSettingsModal = 0
  }

  const clearSettings = () => {
    resetChatSettings(chatId)
    showSettingsModal++ // Make sure the dialog updates
  }

  const refreshSettings = async () => {
    showSettingsModal && showSettings()
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
      refreshSettings()
    } catch (e) {
      window.alert('Error cloning profile: \n' + e.message)
    }
  }

  const deleteProfile = () => {
    showProfileMenu = false
    try {
      deleteCustomProfile(chatId, chat.settings.profile as any)
      chat.settings.profile = globalStore.defaultProfile || ''
      saveChatStore()
      setGlobalSettingValueByKey('lastProfile', chat.settings.profile)
      applyProfile(chatId, chat.settings.profile as any)
      refreshSettings()
    } catch (e) {
      window.alert('Error deleting profile: \n' + e.message)
    }
  }

  const pinDefaultProfile = () => {
    showProfileMenu = false
    setGlobalSettingValueByKey('defaultProfile', chat.settings.profile)
    refreshSettings()
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
        refreshSettings()
      } catch (e) {
        window.alert('Unable to import profile: \n' + e.message)
      }
    }
  }

  const updateProfileSelectOptions = () => {
    const profileSelect = getChatSettingObjectByKey('profile') as ChatSetting & SettingSelect
    profileSelect.options = getProfileSelect()
    chatDefaults.profile = getDefaultProfileKey()
    // const defaultProfile = globalStore.defaultProfile || profileSelect.options[0].value
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

    setTimeout(() => sizeTextElements(), 0)
  }

  const debounce = {}

  const queueSettingValueChange = (event: Event, setting: ChatSetting) => {
    clearTimeout(debounce[setting.key])
    if (event.target === null) return
    const val = chatSettings[setting.key]
    const el = (event.target as HTMLInputElement)
    const doSet = () => {
      try {
        (typeof setting.beforeChange === 'function') && setting.beforeChange(chatId, setting, el.checked || el.value) &&
          refreshSettings()
      } catch (e) {
        window.alert('Unable to change:\n' + e.message)
      }
      switch (setting.type) {
        case 'boolean':
          setChatSettingValue(chatId, setting, el.checked)
          refreshSettings()
          break
        default:
          setChatSettingValue(chatId, setting, el.value)
      }
      try {
        (typeof setting.afterChange === 'function') && setting.afterChange(chatId, setting, chatSettings[setting.key]) &&
          refreshSettings()
      } catch (e) {
        setChatSettingValue(chatId, setting, val)
        window.alert('Unable to change:\n' + e.message)
      }
    }
    if (setting.key === 'profile' && chat.sessionStarted &&
      (getProfile(el.value).characterName !== chatSettings.characterName)) {
      const val = chatSettings[setting.key]
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

  const saveProfile = () => {
    showProfileMenu = false
    try {
      saveCustomProfile(chat.settings)
      refreshSettings()
    } catch (e) {
      window.alert('Error saving profile: \n' + e.message)
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

</script>


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
              <span class="menu-icon"><Fa icon={faFloppyDisk}/></span> Save Profile
            </a>
            <a href={'#'} class="dropdown-item" on:click|preventDefault={cloneProfile}>
              <span class="menu-icon"><Fa icon={faClone}/></span> Clone Profile
            </a>
            <hr class="dropdown-divider">
            <a href={'#'} class="dropdown-item" on:click|preventDefault={pinDefaultProfile}>
              <span class="menu-icon"><Fa icon={faThumbtack}/></span> Set as Default Profile
            </a>
            <hr class="dropdown-divider">
            <a href={'#'} 
              class="dropdown-item"
              on:click|preventDefault={() => { showProfileMenu = false; exportProfileAsJSON(chatId) }}
            >
              <span class="menu-icon"><Fa icon={faDownload}/></span> Backup Profile JSON
            </a>
            <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { showProfileMenu = false; profileFileInput.click() }}>
              <span class="menu-icon"><Fa icon={faUpload}/></span> Restore Profile JSON
            </a>
            <hr class="dropdown-divider">
            <a href={'#'} class="dropdown-item" on:click|preventDefault={deleteProfile}>
              <span class="menu-icon"><Fa icon={faTrash}/></span> Delete Profile
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
              checked={!!chatSettings[setting.key]} 
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
            >{chatSettings[setting.key]}</textarea>
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
                  value={chatSettings[setting.key]}
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  placeholder={String(setting.placeholder)}
                  on:change={e => queueSettingValueChange(e, setting)}
                />
              {:else if setting.type === 'select'}
                <div class="select">
                  <select id="settings-{setting.key}" title="{setting.title}" on:change={e => queueSettingValueChange(e, setting) } >
                    {#each setting.options as option}
                      <option class:is-default={option.value === chatDefaults[setting.key]} value={option.value} selected={option.value === chatSettings[setting.key]}>{option.text}</option>
                    {/each}
                  </select>
                </div>
              {:else if setting.type === 'text'}
                <div class="field">
                    <input 
                    type="text"
                    title="{setting.title}"
                    class="input" 
                    value={chatSettings[setting.key]} 
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
      <button class="button is-info" on:click={closeSettings}>Close</button>
      <button class="button is-warning" on:click={clearSettings}>Reset</button>
    </footer>
  </div>
</div>

<input style="display:none" type="file" accept=".json" on:change={(e) => importProfileFromFile(e)} bind:this={profileFileInput} >

<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') {
      closeSettings()
    }
  }}
/>