<script context="module" lang="ts">
  import { persisted } from 'svelte-local-storage-store'
  import { get } from 'svelte/store'
  import type { Chat, ChatSettings, GlobalSettings, Message, ChatSetting, GlobalSetting } from './Types.svelte'
  import { getChatSettingByKey, getGlobalSettingByKey } from './Settings.svelte'
  import { v4 as uuidv4 } from 'uuid'
  import { isStaticProfile } from './Profiles.svelte'

  export const chatsStorage = persisted('chats', [] as Chat[])
  export const globalStorage = persisted('global', {} as GlobalSettings)
  export const apiKeyStorage = persisted('apiKey', '' as string)

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
      messages: []
    })
    chatsStorage.set(chats)
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
    return chatId
  }

  export const getChat = (chatId: number):Chat => {
    const chats = get(chatsStorage)
    return chats.find((chat) => chat.id === chatId) as Chat
  }

  export const clearChats = () => {
    chatsStorage.set([])
  }
  export const saveChatStore = () => {
    const chats = get(chatsStorage)
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

    // Find the max chatId
    const newId = newChatID()

    // Add a new chat
    chats.push({
      id: newId,
      name: cname,
      settings: JSON.parse(JSON.stringify(chat.settings)),
      messages: JSON.parse(JSON.stringify(chat.messages))
    })
    // chatsStorage
    chatsStorage.set(chats)
  }

  export const cleanSettingValue = (chatId, setting:(GlobalSetting | ChatSetting), value: any) => {
    switch (setting.type) {
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
  
  export const setGlobalSettingValueByKey = (key: keyof GlobalSettings, value) => {
    return setGlobalSettingValue(getGlobalSettingByKey(key), value)
  }

  export const setGlobalSettingValue = (setting: GlobalSetting, value) => {
    const store = get(globalStorage)
    store[setting.key] = cleanSettingValue(0, setting, value)
    globalStorage.set(store)
  }
  
  export const setChatSettingValueByKey = (chatId: number, key: keyof ChatSettings, value) => {
    return setChatSettingValue(chatId, getChatSettingByKey(key), value)
  }

  export const setChatSettingValue = (chatId: number, setting: ChatSetting, value) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    let settings:ChatSettings = chat.settings
    if (!settings) {
      settings = {} as ChatSettings
      chat.settings = settings
    }
    if (typeof setting.setFilter === 'function') value = setting.setFilter(chatId, setting, value)
    settings[setting.key] = cleanSettingValue(chatId, setting, value)
    chatsStorage.set(chats)
  }

  export const getGlobalSettingValueNullDefault = (setting: GlobalSetting) => {
    const store = get(globalStorage)
    let value = store && store[setting.key] as any
    value = (value === undefined) ? null : value
    return value
  }

  export const getGlobalSettingValue = (setting: GlobalSetting) => {
    let value = getGlobalSettingValueNullDefault(setting)
    if (value === null) value = setting.default
    return value as any
  }

  export const getGlobalSettingValueByKey = (key: keyof GlobalSettings) => {
    return getGlobalSettingValue(getGlobalSettingByKey(key))
  }

  export const getChatSettingValueNullDefault = (chatId: number, setting: ChatSetting):any => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    let value = chat.settings && chat.settings[setting.key]
    value = (value === undefined) ? null : value
    if (value === setting.default) value = null
    if (typeof setting.getFilter === 'function') value = setting.getFilter(chatId, setting, value)
    return value
  }

  export const getChatSettingValue = (chatId: number, setting: ChatSetting):any => {
    let value = getChatSettingValueNullDefault(chatId, setting)
    if (value === null) value = setting.default
    return value
  }

  export const getChatSettingValueByKey = (chatId: number, key: keyof ChatSettings):any => {
    return getChatSettingValue(chatId, getChatSettingByKey(key)) as any
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
    profiles[profile.profile as string] = JSON.parse(JSON.stringify(profile)) // Always store a copy
    globalStorage.set(store)
  }
  
</script>
