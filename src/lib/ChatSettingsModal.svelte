<script lang="ts">
  import { applyProfile, getDefaultProfileKey, getProfile, getProfileSelect, newNameForProfile, setSystemPrompt } from './Profiles.svelte'
  import { getChatDefaults, getChatSettingList, getChatSettingObjectByKey, getExcludeFromProfile, hasChatSetting } from './Settings.svelte'
  import {
    saveChatStore,
    chatsStorage,
    globalStorage,
    saveCustomProfile,
    deleteCustomProfile,
    setGlobalSettingValueByKey,
    resetChatSettings,
    checkStateChange,
    addChat
  } from './Storage.svelte'
  import type { Chat, ChatSetting, SettingSelect, ChatSettings } from './Types.svelte'
  import { errorNotice, sizeTextElements } from './Util.svelte'
  import Fa from 'svelte-fa'
  import {
    faTrash,
    faClone,
    faEllipsis,
    faFloppyDisk,
    faThumbtack,
    faDownload,
    faUpload,
    faSquarePlus,
    faRotateLeft
  } from '@fortawesome/free-solid-svg-icons/index'
  import { exportProfileAsJSON } from './Export.svelte'
  import { onMount, afterUpdate } from 'svelte'
  import ChatSettingField from './ChatSettingField.svelte'
  import { getModelMaxTokens } from './Stats.svelte'
  import { replace } from 'svelte-spa-router'
  import { openModal } from 'svelte-modals/legacy'
  import PromptConfirm from './PromptConfirm.svelte'
  import { getChatModelOptions, getImageModelOptions } from './Models.svelte'
  import { faClipboard } from '@fortawesome/free-regular-svg-icons'
  import { clickOutside } from 'svelte-use-click-outside'

  export let chatId:number
  export const show = () => { showSettings() }
  
  let showSettingsModal = 0
  let showProfileMenu:boolean = false
  let profileFileInput
  let defaultProfile
  let isDefault = false

  const settingsList = getChatSettingList()
  const modelSetting = getChatSettingObjectByKey('model') as ChatSetting & SettingSelect
  const imageModelSetting = getChatSettingObjectByKey('imageGenerationModel') as ChatSetting & SettingSelect
  const chatDefaults = getChatDefaults()
  const excludeFromProfile = getExcludeFromProfile()

  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: chatSettings = chat.settings
  $: globalStore = $globalStorage

  let originalProfile:string
  let lastProfile:string
  let originalSettings:ChatSettings

  onMount(async () => {
    originalProfile = chatSettings && chatSettings.profile
    originalSettings = chatSettings && JSON.parse(JSON.stringify(chatSettings))

    defaultProfile = await getDefaultProfileKey()
  })

  afterUpdate(() => {
    if (!originalProfile) {
      originalProfile = chatSettings && chatSettings.profile
      originalSettings = chatSettings && JSON.parse(JSON.stringify(chatSettings))
    }
    sizeTextElements()
  })
  
  const closeSettings = () => {
    originalProfile = ''
    originalSettings = {} as ChatSettings
    showProfileMenu = false
    applyToChat()
    $checkStateChange++
    showSettingsModal = 0
  }

  const clearSettings = () => {
    openModal(PromptConfirm, {
      title: 'Reset Changes',
      message: 'Are you sure you want to reset all changes you\'ve made to this profile?',
      class: 'is-warning',
      onConfirm: () => {
        resetChatSettings(chatId)
        refreshSettings()
      }
    })
  }

  const refreshSettings = async () => {
    showSettingsModal && showSettings()
  }
  
  const copySettingsAsUri = () => {
    const uri = '#/chat/new?petals=true&' + Object.entries(chatSettings).reduce((a, [k, v]) => {
      const t = typeof v
      if (hasChatSetting(k as any) && (t === 'boolean' || t === 'string' || t === 'number')) {
        a.push(encodeURIComponent(k) + '=' + encodeURIComponent(v as any))
      }
      return a
    }, [] as string[]).join('&')
    const profileUri = window.location.protocol + '//' + window.location.host + window.location.pathname + uri
    navigator.clipboard.writeText(profileUri)
    return profileUri
  }

  const cloneProfile = async () => {
    showProfileMenu = false
    const clone = JSON.parse(JSON.stringify(chat.settings))
    const name = chat.settings.profileName
    clone.profileName = await newNameForProfile(name || '')
    clone.profile = null
    try {
      await saveCustomProfile(clone)
      chat.settings.profile = clone.profile
      chat.settings.profileName = clone.profileName
      await applyProfile(chatId, clone.profile)
      refreshSettings()
    } catch (e) {
      errorNotice('Error cloning profile:', e)
    }
  }

  const promptDeleteProfile = () => {
    openModal(PromptConfirm, {
      title: 'Delete Profile',
      message: 'Are you sure you want to delete this profile?',
      class: 'is-warning',
      onConfirm: () => {
        deleteProfile()
      }
    })
  }

  const deleteProfile = async () => {
    showProfileMenu = false
    try {
      await deleteCustomProfile(chatId, chat.settings.profile)
      chat.settings.profile = globalStore.defaultProfile || ''
      saveChatStore()
      setGlobalSettingValueByKey('lastProfile', chat.settings.profile)
      await applyProfile(chatId, chat.settings.profile)
      refreshSettings()
    } catch (e) {
      console.error(e)
      errorNotice('Error deleting profile:', e)
    }
  }

  const pinDefaultProfile = () => {
    showProfileMenu = false
    setGlobalSettingValueByKey('defaultProfile', chat.settings.profile)
    refreshSettings()
  }

  const importProfileFromFile = async (e) => {
    const image = e.target.files[0]
    e.target.value = null
    const reader = new FileReader()
    reader.readAsText(image)
    reader.onload = async (e) => {
      const json = (e.target || {}).result as string
      try {
        const profile = JSON.parse(json)
        profile.profileName = await newNameForProfile(profile.profileName || '')
        profile.profile = null
        await saveCustomProfile(profile)
        refreshSettings()
      } catch (e) {
        errorNotice('Unable to import profile:', e)
      }
    }
  }

  const updateProfileSelectOptions = async () => {
    const profileSelect = getChatSettingObjectByKey('profile') as ChatSetting & SettingSelect
    profileSelect.options = await getProfileSelect()
    chatDefaults.profile = await getDefaultProfileKey()
    chatDefaults.max_completion_tokens = getModelMaxTokens(chatSettings.model)
    defaultProfile = await getDefaultProfileKey()
    isDefault = defaultProfile === chatSettings.profile
  }
  
  const showSettings = async () => {
    await setDirty()
    // Show settings modal
    showSettingsModal++

    // Get profile options
    await updateProfileSelectOptions()

    // Refresh settings modal
    showSettingsModal++

    // Update the models in the settings
    if (modelSetting) {
      modelSetting.options = await getChatModelOptions()
      imageModelSetting.options = await getImageModelOptions()
    }
    // Refresh settings modal
    showSettingsModal++

    const profileChanged = lastProfile !== chatSettings.profile
    lastProfile = chatSettings.profile

    setTimeout(() => sizeTextElements(profileChanged))
  }

  const saveProfile = async () => {
    showProfileMenu = false
    try {
      await saveCustomProfile(chat.settings)
      refreshSettings()
    } catch (e) {
      errorNotice('Error saving profile:', e)
    }
  }

  const startNewChat = async () => {
    const differentProfile = originalSettings.profile !== chatSettings.profile
    // start new
    const newChatId = await addChat(chatSettings)
    // restore original
    if (differentProfile) {
      chat.settings = originalSettings
      saveChatStore()
    }
    // go to new chat
    replace(`/chat/${newChatId}`)
  }

  const deepEqual = (x:any, y:any) => {
    const ok = Object.keys; const tx = typeof x; const ty = typeof y
    return x && y && tx === 'object' && tx === ty
      ? (
          ok(x).every(key => excludeFromProfile[key] || deepEqual(x[key], y[key]))
        )
      : (x === y || ((x === undefined || x === null || x === false) && (y === undefined || y === null || y === false)))
  }

  const setDirty = async (e:CustomEvent|undefined = undefined) => {
    if (e) {
      const setting = e.detail as ChatSetting
      const key = setting.key
      if (key === 'profile') return
    }
    const profile = await getProfile(chatSettings.profile)
    chatSettings.isDirty = !deepEqual(profile, chatSettings)
  }

  const applyToChat = () => {
    if (chatSettings.useSystemPrompt) {
      setSystemPrompt(chatId)
    }
  }

</script>

<div class="modal chat-settings" class:is-active={showSettingsModal} on:modal-esc={closeSettings}>
  <button
    type="button"
    class="modal-background"
    aria-label="Close chat settings"
    on:click={closeSettings}
  ></button>
  <div class="modal-card wide">
    <header class="modal-card-head">
      <p class="modal-card-title">Chat Settings</p>
      <button class="delete" aria-label="close" type="button" on:click={closeSettings}></button>
    </header>
    <section class="modal-card-body">
      {#each settingsList as setting}
        <ChatSettingField rkey={showSettingsModal} on:refresh={refreshSettings} on:change={setDirty} chat={chat} chatDefaults={chatDefaults} chatSettings={chatSettings} setting={setting} />
      {/each}
    </section>

    <footer class="modal-card-foot">
      <div class="level is-mobile">
        <div class="level-left">
          <button class="button" type="button" title="Save changes to this profile." class:is-disabled={!chatSettings.isDirty} on:click={saveProfile}>Save</button>    
          <button class="button is-warning" type="button" title="Throw away changes to this profile." class:is-disabled={!chatSettings.isDirty} on:click={clearSettings}>Reset</button>
          <button class="button" type="button" title="Start new chat with this profile." on:click={startNewChat}>New Chat <span class="is-hidden-mobile">&nbsp;from Current</span></button>
        </div>
        <div class="level-right">
          <div class="dropdown is-right is-up" class:is-active={showProfileMenu} use:clickOutside={() => { showProfileMenu = false }}>
            <div class="dropdown-trigger">
              <button class="button" type="button" aria-haspopup="true" aria-controls="dropdown-menu3" on:click|preventDefault|stopPropagation={() => { showProfileMenu = !showProfileMenu }}>
                <span class="icon"><Fa icon={faEllipsis}/></span>
              </button>
            </div>
            <div class="dropdown-menu" id="dropdown-menu3" role="menu">
              <div class="dropdown-content">
                <button type="button" class="dropdown-item" class:is-disabled={!chatSettings.isDirty} disabled={!chatSettings.isDirty} on:click={saveProfile}>
                  <span class="menu-icon"><Fa icon={faFloppyDisk}/></span> Save Changes
                </button>
                <button type="button" class="dropdown-item" class:is-disabled={!chatSettings.isDirty} disabled={!chatSettings.isDirty} on:click={clearSettings}>
                  <span class="menu-icon"><Fa icon={faRotateLeft}/></span> Reset Changes
                </button>
                <button type="button" class="dropdown-item" on:click={cloneProfile}>
                  <span class="menu-icon"><Fa icon={faClone}/></span> Clone Profile
                </button>
                <hr class="dropdown-divider">
                <button type="button" class="dropdown-item" class:is-disabled={isDefault} disabled={isDefault} on:click={pinDefaultProfile}>
                  <span class="menu-icon"><Fa icon={faThumbtack}/></span> Set as Default Profile
                </button>
                <button type="button" class="dropdown-item" on:click={startNewChat}>
                  <span class="menu-icon"><Fa icon={faSquarePlus}/></span> Start New Chat from Current
                </button>
                <hr class="dropdown-divider">
                <button
                  type="button"
                  class="dropdown-item"
                  on:click={() => { showProfileMenu = false; exportProfileAsJSON(chatId) }}
                >
                  <span class="menu-icon"><Fa icon={faDownload}/></span> Backup Profile JSON
                </button>
                <button type="button" class="dropdown-item" on:click={() => { showProfileMenu = false; profileFileInput.click() }}>
                  <span class="menu-icon"><Fa icon={faUpload}/></span> Restore Profile JSON
                </button>
                <button type="button" class="dropdown-item" on:click={() => { showProfileMenu = false; copySettingsAsUri() }}>
                  <span class="menu-icon"><Fa icon={faClipboard}/></span> Copy Profile URL to Clipboard
                </button>
                <hr class="dropdown-divider">
                <button type="button" class="dropdown-item" on:click={promptDeleteProfile}>
                  <span class="menu-icon"><Fa icon={faTrash}/></span> Delete Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </footer>
  </div>
</div>

<input style="display:none" type="file" accept=".json" on:change={async (e) => await importProfileFromFile(e)} bind:this={profileFileInput} >
