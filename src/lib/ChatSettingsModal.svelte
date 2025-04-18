<script lang="ts">
  import { applyProfile, getDefaultProfileKey, getProfile, getProfileSelect, newNameForProfile, setSystemPrompt, isStaticProfile } from './Profiles.svelte'
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
  import Fa from 'svelte-fa/src/fa.svelte'
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
    // faCheckCircle
  } from '@fortawesome/free-solid-svg-icons/index'
  import { exportProfileAsJSON } from './Export.svelte'
  import { onMount, afterUpdate, setContext } from 'svelte'
  import ChatSettingField from './ChatSettingField.svelte'
  import { getChatModelOptions, getImageModelOptions } from './Models.svelte'
  import { faClipboard } from '@fortawesome/free-regular-svg-icons'
  import { replace } from 'svelte-spa-router'
  import { openModal } from 'svelte-modals'
  import PromptConfirm from './PromptConfirm.svelte'

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

  let showAdvancedSettings = false

  $: visibleSettings = showAdvancedSettings
    ? settingsList
    : settingsList.filter(s => !s.hidden)

  let modalBody: HTMLElement

  let showStaticProfileSaveModal = false
  let pendingSave = false
  let staticProfileNewName = ''

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

  // Provide promptDeleteProfile to children via context (must be outside onMount)
  setContext('promptDeleteProfile', promptDeleteProfile)

  onMount(async () => {
    originalProfile = chatSettings && chatSettings.profile
    originalSettings = chatSettings && JSON.parse(JSON.stringify(chatSettings))
    defaultProfile = await getDefaultProfileKey()
    // Ensure model options are loaded on mount
    modelSetting.options = await getChatModelOptions()
    imageModelSetting.options = await getImageModelOptions()
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
    // location.protocol + '//' + location.host + location.pathname
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
      // Scroll to top of modal body after cloning
      setTimeout(() => {
        if (modalBody) {
          modalBody.scrollTop = 0
        }
      }, 0)
    } catch (e) {
      errorNotice('Error cloning profile:', e)
    }
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
    // The line I deleted here fetched the max response tokens from the models, but the models have only a max context size parameter
    // const defaultProfile = globalStore.defaultProfile || profileSelect.options[0].value
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
    const isStatic = isStaticProfile(chat.settings.profile)
    if (isStatic && !chatSettings.isDirty) {
      closeSettings()
      return
    }
    if (isStatic && chatSettings.isDirty && !pendingSave) {
      // Generate a new name for the profile and show the modal
      staticProfileNewName = await newNameForProfile(chat.settings.profileName || '')
      showStaticProfileSaveModal = true
      return
    }
    try {
      // If static, set the profileName to the user input
      if (isStatic && pendingSave) {
        chat.settings.profileName = staticProfileNewName
      }
      await saveCustomProfile(chat.settings)
      chat.settings = await getProfile(chat.settings.profile)
      closeSettings()
    } catch (e) {
      errorNotice('Error saving profile:', e)
    }
  }

  const confirmStaticProfileSave = async () => {
    showStaticProfileSaveModal = false
    pendingSave = true
    await saveProfile()
    pendingSave = false
  }

  const cancelStaticProfileSave = () => {
    showStaticProfileSaveModal = false
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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal chat-settings" class:is-active={showSettingsModal} on:modal-esc={closeSettings}>
  <div class="modal-background" on:click={closeSettings} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeSettings() }} />
  <div class="modal-card wide" on:click={() => { showProfileMenu = false }}>
    <header class="modal-card-head">
      <p class="modal-card-title">Chat Settings</p>
      <button class="delete" aria-label="close" on:click={closeSettings}></button>
    </header>
    <section class="modal-card-body" bind:this={modalBody}>
      {#each visibleSettings as setting}
        <ChatSettingField rkey={showSettingsModal} on:refresh={refreshSettings} on:change={setDirty} chat={chat} chatDefaults={chatDefaults} chatSettings={chatSettings} setting={setting} originalProfile={originalProfile} />
        {#if setting.key === 'temperature'}
          <button class="button is-small is-info mt-3 mb-4" on:click={() => { showAdvancedSettings = !showAdvancedSettings }}>
            {showAdvancedSettings ? 'Hide advanced settings' : 'Show advanced settings'}
          </button>
        {/if}
      {/each}
    </section>

    <footer class="modal-card-foot">
      <div class="level is-mobile">
        <div class="level-left">
          <!-- <button class="button is-info" on:click={closeSettings}>Close</button> -->
          <button class="button" title="Save changes to this profile." on:click={saveProfile}>Save</button>    
          <button class="button is-warning" title="Throw away changes to this profile." class:is-disabled={!chatSettings.isDirty} on:click={clearSettings}>Reset</button>
          <button class="button" title="Clone this profile." on:click={cloneProfile}>
            <span class="icon"><Fa icon={faClone}/></span>
            <span>Clone Profile</span>
          </button>
        </div>
        <div class="level-right">
          <div class="dropdown is-right is-up" class:is-active={showProfileMenu}>
            <div class="dropdown-trigger">
              <button class="button" aria-haspopup="true" aria-controls="dropdown-menu3" on:click|preventDefault|stopPropagation={() => { showProfileMenu = !showProfileMenu }}>
                <span class="icon"><Fa icon={faEllipsis}/></span>
              </button>
            </div>
            <div class="dropdown-menu" id="dropdown-menu3" role="menu">
              <div class="dropdown-content">
                <a href={'#'} class="dropdown-item" class:is-disabled={!chatSettings.isDirty} on:click|preventDefault={saveProfile}>
                  <span class="menu-icon"><Fa icon={faFloppyDisk}/></span> Save Changes
                </a>
                <a href={'#'} class="dropdown-item" class:is-disabled={!chatSettings.isDirty} on:click|preventDefault={clearSettings}>
                  <span class="menu-icon"><Fa icon={faRotateLeft}/></span> Reset Changes
                </a>
                <a href={'#'} class="dropdown-item" on:click|preventDefault={cloneProfile}>
                  <span class="menu-icon"><Fa icon={faClone}/></span> Clone Profile
                </a>
                <hr class="dropdown-divider">
                <a href={'#'} class:is-disabled={isDefault} on:click|preventDefault={pinDefaultProfile}>
                  <span class="menu-icon"><Fa icon={faThumbtack}/></span> Set as Default Profile
                </a>
                <a href={'#'} class="dropdown-item" on:click|preventDefault={startNewChat}>
                  <span class="menu-icon"><Fa icon={faSquarePlus}/></span> Start New Chat from Current
                </a>
                <!-- <a href={'#'} class="dropdown-item" on:click|preventDefault={applyToChat}>
                  <span class="menu-icon"><Fa icon={faCheckCircle}/></span> Apply Prompts to Current Chat
                </a> -->
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
                <a href={'#'} class="dropdown-item" on:click|preventDefault={() => { showProfileMenu = false; copySettingsAsUri() }}>
                  <span class="menu-icon"><Fa icon={faClipboard}/></span> Copy Profile URL to Clipboard
                </a>
                <hr class="dropdown-divider">
                <a href={'#'} class="dropdown-item" on:click|preventDefault={promptDeleteProfile}>
                  <span class="menu-icon"><Fa icon={faTrash}/></span> Delete Profile
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </footer>
  </div>
</div>

<input style="display:none" type="file" accept=".json" on:change={async (e) => await importProfileFromFile(e)} bind:this={profileFileInput} >

{#if showStaticProfileSaveModal}
  <div class="modal is-active">
    <div class="modal-background" on:click={cancelStaticProfileSave} on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') cancelStaticProfileSave() }} tabindex="0" role="button" aria-label="Close modal" />
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Save as New Profile</p>
        <button class="delete" aria-label="close" on:click={cancelStaticProfileSave}></button>
      </header>
      <section class="modal-card-body">
        <p>You are modifying a preset profile. Your changes will be saved as a new custom profile. Please enter a name for the new profile:</p>
        <input class="input mt-3" type="text" bind:value={staticProfileNewName} autocomplete="off" style="width:100%" />
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" on:click={confirmStaticProfileSave}>Yes, Save as New Profile</button>
        <button class="button" on:click={cancelStaticProfileSave}>Cancel</button>
      </footer>
    </div>
  </div>
{/if}
