<script lang="ts">
  import { querystring } from 'svelte-spa-router'
  import { addChat } from './Storage.svelte'
  import { replace } from 'svelte-spa-router'
  import { getProfile } from './Profiles.svelte'

  // Create the new chat instance then redirect to it

  const urlParams: URLSearchParams = new URLSearchParams($querystring)
  const chatId = urlParams.has('p') ? addChat(getProfile(urlParams.get('p') || '')) : addChat()

  replace(`/chat/${chatId}`)
</script>
