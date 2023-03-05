<script context="module" lang="ts">
  import { persisted } from "svelte-local-storage-store";
  import { get } from "svelte/store";
  import type { Chat, Message } from "./Types.svelte";

  export const chatsStorage = persisted("chats", [] as Chat[]);
  export const apiKeyStorage = persisted("apiKey", null as string);

  export const addChat = (): number => {
    const chats = get(chatsStorage);

    // Find the max chatId
    const chatId = chats.reduce((maxId, chat) => Math.max(maxId, chat.id), 0) + 1;

    // Add a new chat
    chats.push({
      id: chatId,
      name: `Chat ${chatId}`,
      messages: [],
    });
    chatsStorage.set(chats);
    return chatId;
  };

  export const clearChats = () => {
    chatsStorage.set([]);
  };

  export const addMessage = (chatId: number, message: Message) => {
      const chats = get(chatsStorage);
      const chat = chats.find((chat) => chat.id === chatId);

      // Check if the message has a parentId, indicating that it's an edited message
      if (message.parentId !== undefined) {
          // Find the parent message
          const parentMessage = findMessageById(chat.messages, message.parentId);
          // Create a new message with the same text and user as the original message,
          // but with a new id and a parentId of the original message's parentId
          const newMessage: Message = {
              id: generateNewMessageId(),
              role: message.role,
              content: message.content,
              usage: message.usage,
              parentId: parentMessage?.id,
              children: [],
              // new date, right now
              timestamp: new Date().getTime(),
          };

          // Add the new message as a child of the original message
          if (parentMessage) {
              parentMessage.children = [...parentMessage.children, newMessage];
          } else {
              chat.messages.push(newMessage);
          }
      } else {
          // If the message doesn't have a parentId, it's a new message
          let newMessage: Message = {
              ...message,
              id: generateNewMessageId(),
              parentId: getLastIDInChat(chat),
              children: [],
              timestamp: new Date().getTime(),
          };
          chat.messages.push(newMessage);

          if (newMessage.parentId === undefined) {
              return;
          }

          const parentMessage = findMessageById(chat.messages, newMessage.parentId);
          parentMessage.children = [...parentMessage.children, newMessage];
      }

      chatsStorage.set(chats);
  };


  function getLastIDInChat(chat: Chat): number {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage) {
          return lastMessage.id;
      }
      return undefined;
  }

  export function generateNewMessageId(): number {
      const chats = get(chatsStorage);
      const allMessages = chats.flatMap((chat) => chat.messages);
      return allMessages.reduce((maxId, message) => Math.max(maxId, message.id), 0) + 1;
  }

  function findMessageById(messages: Message[], id: number): Message | undefined {
      if (id === undefined || messages === undefined) {
          return undefined;
      }

      for (const m of messages) {
          if (m.id === id) {
              return m;
          }
          const childMessage = findMessageById(m.children || [], id);
          if (childMessage) {
              return childMessage;
          }
      }
      return undefined;
  }

  export const editMessage = (chatId: number, index: number, newMessage: Message) => {
    const chats = get(chatsStorage);
    const chat = chats.find((chat) => chat.id === chatId);
    chat.messages[index] = newMessage;
    chat.messages.splice(index + 1); // remove the rest of the messages
    chatsStorage.set(chats);
  };

  export const clearMessages = (chatId: number) => {
    const chats = get(chatsStorage);
    const chat = chats.find((chat) => chat.id === chatId);
    chat.messages = [];
    chatsStorage.set(chats);
  };

  export const deleteChat = (chatId: number) => {
    const chats = get(chatsStorage);
    const chatIndex = chats.findIndex((chat) => chat.id === chatId);
    chats.splice(chatIndex, 1);
    chatsStorage.set(chats);
  };
</script>
