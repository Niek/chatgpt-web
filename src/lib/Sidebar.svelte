<script lang="ts">
    import { params, replace } from 'svelte-spa-router'

    import { apiKeyStorage, chatsStorage, clearChats, deleteChat } from './Storage.svelte'
    import { exportAsMarkdown } from './Export.svelte'
    import { Sidebar, SidebarGroup, SidebarItem, SidebarWrapper } from 'flowbite-svelte'

    $: sortedChats = $chatsStorage.sort((a, b) => b.id - a.id)

    $: activeChatId = $params && $params.chatId ? parseInt($params.chatId) : undefined

    function delChat (chatId) {
      if (activeChatId === chatId) {
        // Find the max chatId other than the current one
        const newChatId = sortedChats.reduce((maxId, chat) => {
          if (chat.id === chatId) return maxId
          return Math.max(maxId, chat.id)
        }, 0)

        if (!newChatId) {
          // No other chats, clear all and go to home
          replace('/').then(() => {
            deleteChat(chatId)
          })
        } else {
          // Delete the current chat and go to the max chatId
          replace(`/chat/${newChatId}`).then(() => {
            deleteChat(chatId)
          })
        }
      } else {
        deleteChat(chatId)
      }
    }
</script>

<Sidebar>
    <SidebarWrapper>
        <SidebarGroup ulClass="my-0">
            {#each sortedChats as chat}

                <li class="group flex relative flex-row justify-between items-center dark:hover:bg-gray-700 rounded-lg" class:bg-gray-700={activeChatId === chat.id}>
                    <a class="flex items-center grow justify-between dark:text-white p-2 text-base font-normal text-gray-900"
                       href={`#/chat/${chat.id}`}>{chat.name || `Chat ${chat.id}`}</a>
                    <a class="absolute ml-auto right-0 hidden group-hover:!inline px-1 py-0 grayscale group/del" href={'$'} on:click|preventDefault={() => delChat(chat.id)}>🗑️</a>
                </li>

            {/each}
        </SidebarGroup>

        <SidebarGroup border>
            <SidebarItem label="Api key" active={!activeChatId}>
                <a href="#/" slot="icon" class="grayscale">🔑</a>
            </SidebarItem>
            <SidebarItem label="New chat" href={'#/chat/new'}>
                <span slot="icon" class="grayscale">➕</span>
            </SidebarItem>

            <SidebarItem label="Clear chats" href="{'#/'}" on:click={(e) => {
            e.preventDefault()
            if (!apiKeyStorage) return
          const confirmDelete = window.confirm('Are you sure you want to delete all your chats?')
          if (confirmDelete) {
            replace('#/').then(() => clearChats())
          }
        }}>
                <span slot="icon" class="grayscale">🗑️</span>
            </SidebarItem>

            <SidebarItem label="Export chat" on:click={(e) => {
         e.preventDefault()
         if (!apiKeyStorage) return
         if (activeChatId) {
              exportAsMarkdown(activeChatId)
            }
          }}>
                <span slot="icon" class="grayscale">📥</span>
            </SidebarItem>

        </SidebarGroup>

    </SidebarWrapper>
</Sidebar>
