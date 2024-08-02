<script lang="ts">
  import { querystring } from 'svelte-spa-router'
  import { addChat, setChatSettingValueByKey } from './Storage.svelte'
  import { replace } from 'svelte-spa-router'
  import { getProfile, restartProfile } from './Profiles.svelte'
  import { getChatDefaults, hasChatSetting } from './Settings.svelte'
  import { onMount } from 'svelte'

  // Create the new chat instance then redirect to it

  onMount(async () => {
    const urlParams: URLSearchParams = new URLSearchParams($querystring)
    const chatId = urlParams.has('p') ? await addChat(await getProfile(urlParams.get('p') || '')) : await addChat()
    Object.keys(getChatDefaults()).forEach(k => {
      if (urlParams.has(k) && hasChatSetting(k as any)) {
        setChatSettingValueByKey(chatId, k as any, urlParams.get(k))
      }
    })
  
    await restartProfile(chatId)
    replace(`/chat/${chatId}`)
  })
</script>