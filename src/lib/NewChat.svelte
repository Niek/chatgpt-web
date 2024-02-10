<script lang="ts">
  import { querystring } from 'svelte-spa-router'
  import {
    addChat,
    addMessage,
    setChatSettingValueByKey,
    submitExitingPromptsNow,
  } from './Storage.svelte'
  import { replace } from 'svelte-spa-router'
  import { getProfile, restartProfile } from './Profiles.svelte'
  import { getChatDefaults, hasChatSetting } from './Settings.svelte'
  import { v4 as uuidv4 } from 'uuid'
  import { type Message } from './Types.svelte'

  // Create the new chat instance then redirect to it

  const urlParams: URLSearchParams = new URLSearchParams($querystring)
  const chatId = urlParams.has("p")
    ? addChat(getProfile(urlParams.get("p") || ""))
    : addChat()
  Object.keys(getChatDefaults()).forEach((k) => {
    if (urlParams.has(k) && hasChatSetting(k as any)) {
      setChatSettingValueByKey(chatId, k as any, urlParams.get(k))
    }
  })

  restartProfile(chatId)
  const messageContent = urlParams.get("message")
  if (messageContent !== null) {
    const uuid = uuidv4()
    const inputMessage: Message = {
      role: "user",
      content: messageContent,
      uuid,
    }
    addMessage(chatId, inputMessage)
    $submitExitingPromptsNow = true
  }

  replace(`/chat/${chatId}`)
</script>
