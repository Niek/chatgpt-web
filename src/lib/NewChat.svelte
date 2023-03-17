<script lang="ts">
  import { addChat } from "./Storage.svelte";
  import { replace } from 'svelte-spa-router'

  // Create the new chat instance then redirect to it
  const chatId = addChat();
  replace(`/chat/${chatId}`);
</script>
