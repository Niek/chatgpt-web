<script context="module" lang="ts">
  import { get } from 'svelte/store'
  import type { Chat } from './Types.svelte'
  import { chatsStorage, getChat } from './Storage.svelte'
  import { getExcludeFromProfile } from './Settings.svelte'
  import { getImage } from './ImageStore.svelte'

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

  export const exportChatAsJSON = async (chatId: number) => {
    const chat = JSON.parse(JSON.stringify(getChat(chatId))) as Chat
    for (let i = 0; i < chat.messages.length; i++) {
      // Pull images out of indexedDB store for JSON download
      const m = chat.messages[i]
      if (m.image) m.image = await getImage(m.image.id)
    }
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
    const clone = JSON.parse(JSON.stringify(chat.settings)) // Clone it
    Object.keys(getExcludeFromProfile()).forEach(k => {
      delete clone[k]
    })
    const exportContent = JSON.stringify(clone)
    const blob = new Blob([exportContent], { type: 'text/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.download = `${clone.profileName}.json`
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
</script>
