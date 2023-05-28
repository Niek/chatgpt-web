<script context="module" lang="ts">
  import { persisted } from 'svelte-local-storage-store'
  import { get } from 'svelte/store'
  import type { Chat, ChatSettings, GlobalSettings, Message, ChatSetting, GlobalSetting, Usage, Model } from './Types.svelte'
  import { getChatSettingObjectByKey, getGlobalSettingObjectByKey, getChatDefaults, getExcludeFromProfile } from './Settings.svelte'
  import { v4 as uuidv4 } from 'uuid'
  import { applyProfile, getProfile, isStaticProfile } from './Profiles.svelte'

  export const chatsStorage = persisted('chats', [] as Chat[])
  export const globalStorage = persisted('global', {} as GlobalSettings)
  export const apiKeyStorage = persisted('apiKey', '' as string)

  const chatDefaults = getChatDefaults()

  export const newChatID = (): number => {
    const chats = get(chatsStorage)
    const chatId = chats.reduce((maxId, chat) => Math.max(maxId, chat.id), 0) + 1
    return chatId
  }

  export const addChat = (): number => {
    const chats = get(chatsStorage)

    // Find the max chatId
    const chatId = newChatID()

    // Add a new chat
    chats.push({
      id: chatId,
      name: `Chat ${chatId}`,
      settings: {} as ChatSettings,
      messages: [],
      usage: {} as Record<Model, Usage>,
      startSession: false,
      sessionStarted: false,
    })
    chatsStorage.set(chats)
    // Apply defaults and prepare it to start
    applyProfile(chatId, '', true)
    return chatId
  }

  export const addChatFromJSON = (json: string): number => {
    const chats = get(chatsStorage)

    // Find the max chatId
    const chatId = newChatID()

    let chat: Chat
    try {
      chat = JSON.parse(json) as Chat
      if (!chat.settings || !chat.messages || isNaN(chat.id)) {
        window.alert('Not valid Chat JSON')
        return 0
      }
    } catch (err) {
      window.alert("Can't parse file JSON")
      return 0
    }

    chat.id = chatId

    // Add a new chat
    chats.push(chat)
    chatsStorage.set(chats)
    // make sure it's up-to-date
    updateChatSettings(chatId)
    return chatId
  }

  // Make sure a chat's settings are set with current values or defaults
  export const updateChatSettings = (chatId:number) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    if (!chat.settings) {
      chat.settings = {} as ChatSettings
    }
    Object.entries(getChatDefaults()).forEach(([k, v]) => {
      const val = chat.settings[k]
      chat.settings[k] = (val === undefined || val === null ? v : chat.settings[k]) as any
    })
    // make sure old chat messages have UUID
    chat.messages.forEach((m) => {
      m.uuid = m.uuid || uuidv4()
    })
    // Make sure the usage totals object is set
    // (some earlier versions of this had different structures)
    const hasUsage = chat.usage && !Array.isArray(chat.usage) &&
      typeof chat.usage === 'object' &&
      Object.values(chat.usage).find(v => 'prompt_tokens' in v)
    if (!hasUsage) {
      const usageMap:Record<Model, Usage> = {}
      chat.usage = usageMap
    }
    if (chat.startSession === undefined) chat.startSession = false
    if (chat.sessionStarted === undefined) chat.sessionStarted = !!chat.messages.find(m => m.role === 'user')
    chatsStorage.set(chats)
  }
  
  // Reset all setting to current profile defaults
  export const resetChatSettings = (chatId, resetAll:boolean = false) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const profile = getProfile(chat.settings.profile)
    const exclude = getExcludeFromProfile()
    if (resetAll) {
      // Reset to base defaults first, then apply profile
      Object.entries(getChatDefaults()).forEach(([k, v]) => {
        chat.settings[k] = v
      })
    }
    Object.entries(profile).forEach(([k, v]) => {
      if (exclude[k]) return
      chat.settings[k] = v
    })
    chatsStorage.set(chats)
  }

  export const clearChats = () => {
    chatsStorage.set([])
  }
  export const saveChatStore = () => {
    const chats = get(chatsStorage)
    chatsStorage.set(chats)
  }

  export const getChat = (chatId: number):Chat => {
    const chats = get(chatsStorage)
    return chats.find((chat) => chat.id === chatId) as Chat
  }

  export const getChatSettings = (chatId: number):ChatSettings => {
    const chats = get(chatsStorage)
    return (chats.find((chat) => chat.id === chatId) as Chat).settings
  }

  export const updateRunningTotal = (chatId: number, usage: Usage, model:Model) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    let total:Usage = chat.usage[model]
    if (!total) {
      total = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
      chat.usage[model] = total
    }
    total.completion_tokens += usage.completion_tokens
    total.prompt_tokens += usage.prompt_tokens
    total.total_tokens += usage.total_tokens
    chatsStorage.set(chats)
  }

  export const addMessage = (chatId: number, message: Message) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    if (!message.uuid) message.uuid = uuidv4()
    chat.messages.push(message)
    chatsStorage.set(chats)
  }

  export const getMessages = (chatId: number):Message[] => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    return chat.messages
  }

  export const insertMessages = (chatId: number, insertAfter: Message, newMessages: Message[]) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const index = chat.messages.findIndex((m) => m.uuid === insertAfter.uuid)
    if (index === undefined || index < 0) {
      console.error("Couldn't insert after message:", insertAfter)
      return
    }
    chat.messages.splice(index + 1, 0, ...newMessages)
    chatsStorage.set(chats)
  }

  export const deleteMessage = (chatId: number, uuid: string) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const index = chat.messages.findIndex((m) => m.uuid === uuid)
    const found = chat.messages.filter((m) => m.uuid === uuid)
    if (index < 0) {
      console.error(`Unable to find and delete message with ID: ${uuid}`)
      return
    }
    console.warn(`Deleting message with ID: ${uuid}`, found, index)
    chat.messages.splice(index, 1) // remove item
    chatsStorage.set(chats)
  }

  export const clearMessages = (chatId: number) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    chat.messages = []
    chatsStorage.set(chats)
  }

  export const deleteChat = (chatId: number) => {
    const chats = get(chatsStorage)
    chatsStorage.set(chats.filter((chat) => chat.id !== chatId))
  }

  export const copyChat = (chatId: number) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const nameMap = chats.reduce((a, chat) => { a[chat.name] = chat; return a }, {})
    let i:number = 1
    let cname = chat.name + `-${i}`
    while (nameMap[cname]) {
      i++
      cname = chat.name + `-${i}`
    }
    const chatCopy = JSON.parse(JSON.stringify(chat))

    // Set the ID
    chatCopy.id = newChatID()

    // Add a new chat
    chats.push(chatCopy)
  
    // chatsStorage
    chatsStorage.set(chats)
  }

  export const cleanSettingValue = (type:string, value: any) => {
    switch (type) {
      case 'number':
        value = parseFloat(value)
        if (isNaN(value)) { value = null }
        return value
      case 'boolean':
        if (typeof value === 'string') value = value.trim().toLocaleLowerCase()
        return value === 'true' || value === 'yes' || (value ? value !== 'false' && value !== 'no' && !!value : false)
      default:
        return value
    }
  }
  
  export const setChatSettingValueByKey = (chatId: number, key: keyof ChatSettings, value) => {
    const setting = getChatSettingObjectByKey(key)
    if (setting) return setChatSettingValue(chatId, setting, value)
    if (!(key in chatDefaults)) throw new Error('Invalid chat setting: ' + key)
    const d = chatDefaults[key]
    if (d === null || d === undefined) {
      throw new Error('Unable to determine setting type for "' +
      key + ' from default of "' + d + '"')
    }
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const settings = chat.settings as any
    settings[key] = cleanSettingValue(typeof d, value)
  }

  export const setChatSettingValue = (chatId: number, setting: ChatSetting, value) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    let settings = chat.settings as any
    if (!settings) {
      settings = {} as ChatSettings
      chat.settings = settings
    }
    settings[setting.key] = cleanSettingValue(setting.type, value)
    chatsStorage.set(chats)
  }

  export const getChatSettingValueNullDefault = (chatId: number, setting: ChatSetting):any => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    let value = chat.settings && chat.settings[setting.key]
    value = (value === undefined) ? null : value
    if (!setting.forceApi && value === chatDefaults[setting.key]) value = null
    return value
  }
  
  export const setGlobalSettingValueByKey = (key: keyof GlobalSettings, value) => {
    return setGlobalSettingValue(getGlobalSettingObjectByKey(key), value)
  }

  export const setGlobalSettingValue = (setting: GlobalSetting, value) => {
    const store = get(globalStorage)
    store[setting.key] = cleanSettingValue(setting.type, value)
    globalStorage.set(store)
  }

  export const getGlobalSettings = ():GlobalSettings => {
    return get(globalStorage)
  }

  export const getCustomProfiles = ():Record<string, ChatSettings> => {
    const store = get(globalStorage)
    return store.profiles || {}
  }

  export const deleteCustomProfile = (chatId:number, profileId:string) => {
    if (isStaticProfile(profileId as any)) {
      throw new Error('Sorry, you can\'t delete a static profile.')
    }
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const store = get(globalStorage)
    if (store.defaultProfile === chat.settings.profile) {
      throw new Error('Sorry, you can\'t delete the default profile.')
    }
    delete store.profiles[profileId]
    globalStorage.set(store)
  }

  export const saveCustomProfile = (profile:ChatSettings) => {
    const store = get(globalStorage)
    let profiles = store.profiles
    if (!profiles) {
      profiles = {}
      store.profiles = profiles
    }
    if (!profile.profile) profile.profile = uuidv4()
    if (isStaticProfile(profile.profile as any)) {
      throw new Error('Sorry, you can\'t modify a static profile. You can clone it though!')
    }
    const mt = profile.profileName && profile.profileName.trim().toLocaleLowerCase()
    const sameTitle = Object.values(profiles).find(c => c.profile !== profile.profile &&
    c.profileName && c.profileName.trim().toLocaleLowerCase() === mt)
    if (sameTitle) {
      throw new Error(`Sorry, another profile already exists with the name "${profile.profileName}"`)
    }
    if (!mt) {
      throw new Error('Sorry, you need to enter a valid name for your profile.')
    }
    if (!profile.characterName || profile.characterName.length < 3) {
      throw new Error('Your profile\'s character needs a valid name.')
    }
    const clone = JSON.parse(JSON.stringify(profile)) // Always store a copy
    Object.keys(getExcludeFromProfile()).forEach(k => {
      delete clone[k]
    })
    profiles[profile.profile as string] = clone
    globalStorage.set(store)
  }
  
</script>
