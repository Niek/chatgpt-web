<script context="module" lang="ts">
  import { persisted } from 'svelte-local-storage-store'
  import { get } from 'svelte/store'
  import type { Chat, Message } from './Types.svelte'

  export const chatsStorage = persisted('chats', [] as Chat[])
  export const apiKeyStorage = persisted('apiKey', '' as string)

  export const addChat = (): number => {
    const chats = get(chatsStorage)

    // Find the max chatId
    const chatId = chats.reduce((maxId, chat) => Math.max(maxId, chat.id), 0) + 1

    // Add a new chat
    chats.push({
      id: chatId,
      name: `Chat ${chatId}`,
      messages: []
    })
    chatsStorage.set(chats)
    return chatId
  }

  export const clearChats = () => {
    chatsStorage.set([])
  }

  export const addMessage = (chatId: number, message: Message) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    chat.messages.push(message)
    chatsStorage.set(chats)
  }

  export const editMessage = (chatId: number, index: number, newMessage: Message) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    chat.messages[index] = newMessage
    chat.messages.splice(index + 1) // remove the rest of the messages
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
</script>
