<script lang="ts">
  import { querystring } from 'svelte-spa-router'
  import { addChat, setChatSettingValueByKey } from './Storage.svelte'
  import { replace } from 'svelte-spa-router'
  import { getProfile, restartProfile } from './Profiles.svelte'
  import { getChatDefaults, hasChatSetting } from './Settings.svelte'

  // Create the new chat instance then redirect to it

  const urlParams: URLSearchParams = new URLSearchParams($querystring)
  const chatId = urlParams.has('p') ? addChat(getProfile(urlParams.get('p') || '')) : addChat()
  Object.keys(getChatDefaults()).forEach(k => {
    if (urlParams.has(k) && hasChatSetting(k as any)) {
      setChatSettingValueByKey(chatId, k as any, urlParams.get(k))
    }
  })
  
  restartProfile(chatId)
  replace(`/chat/${chatId}`)
</script>
