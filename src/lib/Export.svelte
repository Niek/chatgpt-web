<script context="module" lang="ts">
  import { get } from 'svelte/store'
  import type { Chat } from './Types.svelte'
  import { chatsStorage } from './Storage.svelte'

  export const exportAsMarkdown = (chatId: number) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const messages = chat.messages
    let markdownContent = `# ${chat.name}\n`

    messages.forEach((message) => {
      const author = message.role
      const content = message.content
      const messageMarkdown = `## ${author}\n${content}\n\n`

      markdownContent += messageMarkdown
    })
    const blob = new Blob([markdownContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${chat.name}.md`
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  export const exportChatAsJSON = (chatId: number) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const exportContent = JSON.stringify(chat)
    const blob = new Blob([exportContent], { type: 'text/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${chat.name}.json`
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  export const exportProfileAsJSON = (chatId: number) => {
    const chats = get(chatsStorage)
    const chat = chats.find((chat) => chat.id === chatId) as Chat
    const profile = chat.settings
    const exportContent = JSON.stringify(profile)
    const blob = new Blob([exportContent], { type: 'text/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${profile.profileName}.json`
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
</script>
