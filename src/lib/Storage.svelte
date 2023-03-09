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
      messages: [
          {
              id: 0,
              role: "root",
              content: "",
              usage: 0,
              parentId: undefined,
              children: [],
              timestamp: new Date().getTime(),
          }
      ],
    });
    chatsStorage.set(chats);
    return chatId;
  };

  export const clearChats = () => {
    chatsStorage.set([]);
  };

  export const addMessage = (chatId: number, message: Message): number => {
      const chats = get(chatsStorage);
      const chat = chats.find((chat) => chat.id === chatId);

      // Check if the message has a parentId, indicating that it's an edited message
      let newMessage: Message;
      if (message.parentId !== undefined) {
          // Find the parent message
          const parentMessage = findMessageById(chat.messages, message.parentId);
          // Create a new message with the same text and user as the original message,
          // but with a new id and a parentId of the original message's parentId
          newMessage = {
              ...message,
              id: generateNewMessageId(chat),
              children: [],
              timestamp: new Date().getTime(),
          };

          // Add the new message as a child of the original message
          if (parentMessage) {
              parentMessage.children = [...parentMessage.children, newMessage];
          }

          chat.messages.push(newMessage);
      } else {
          // If the message doesn't have a parentId, it's a new message
          newMessage = {
              ...message,
              id: generateNewMessageId(chat),
              parentId: getLastIDInChat(chat),
              children: [],
              timestamp: new Date().getTime(),
          };
          chat.messages.push(newMessage);

          if (newMessage.parentId === undefined) {
              return;
          }

          const parentMessage = findMessageById(chat.messages, newMessage.parentId);

          if (!parentMessage) {
            return;
          }

          parentMessage.children = [...parentMessage.children, newMessage];
      }

      chatsStorage.set(chats);

      return newMessage.id;
  };


  function getLastIDInChat(chat: Chat): number {
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (lastMessage) {
          return lastMessage.id;
      }
      return 0;
  }

  export function generateNewMessageId(chat): number {
      const allMessages = chat.messages
      return allMessages.reduce((maxId, message) => Math.max(maxId, message.id), 0) + 1;
  }

  export function findMessageById(messages: Message[], id: number): Message | undefined {
      if (id === undefined || messages === undefined) {
          return undefined;
      }

      for (const m of messages) {
          if (m.id === id) {
              return m;
          }
      }
      return undefined;
  }

  export const clearMessages = (chatId: number) => {
    const chats = get(chatsStorage);
    const chat = chats.find((chat) => chat.id === chatId);
    // remove all messages with role != system
    chat.messages = chat.messages.filter((message) => message.role === "root");
    // set all children to empty
    chat.messages.forEach((message) => {
      message.children = [];
    });
    chatsStorage.set(chats);
  };

  export const deleteChat = (chatId: number) => {
    const chats = get(chatsStorage);
    const chatIndex = chats.findIndex((chat) => chat.id === chatId);
    chats.splice(chatIndex, 1);
    chatsStorage.set(chats);
  };
</script>
