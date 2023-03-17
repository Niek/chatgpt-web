import Home from "./lib/Home.svelte";
import Chat from "./lib/Chat.svelte";
import NewChat from "./lib/NewChat.svelte";

export default {
    '/': Home,

    '/chat/new': NewChat,
    '/chat/:chatId': Chat,

    '*': Home,
};