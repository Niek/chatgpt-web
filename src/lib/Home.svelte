<script lang="ts">
  import { apiKeyStorage, globalStorage, lastChatId, getChat, started, setGlobalSettingValueByKey } from './Storage.svelte'
  import Footer from './Footer.svelte'
  import { replace } from 'svelte-spa-router'
  import { onMount } from 'svelte'
  import { getPetalsV2Websocket } from './ApiUtil.svelte'

$: apiKey = $apiKeyStorage

let showPetalsSettings = $globalStorage.enablePetals

onMount(() => {
    if (!$started) {
      $started = true
      // console.log('started', apiKey, $lastChatId, getChat($lastChatId))
      if (apiKey && getChat($lastChatId)) {
        const chatId = $lastChatId
        $lastChatId = 0
        replace(`/chat/${chatId}`)
      }
    }
    $lastChatId = 0
})

const setPetalsEnabled = (event: Event) => {
    const el = (event.target as HTMLInputElement)
    setGlobalSettingValueByKey('enablePetals', !!el.checked)
    showPetalsSettings = $globalStorage.enablePetals
}

</script>

<section class="section">
  <article class="message">
    <div class="message-body">
      <strong><a href="https://github.com/Niek/chatgpt-web">ChatGPT-web</a></strong>
      is a simple one-page web interface to the OpenAI ChatGPT API. To use it, you need to register for
      <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noreferrer">an OpenAI API key</a>
      first. OpenAI bills per token (usage-based), which means it is a lot cheaper than
      <a href="https://openai.com/blog/chatgpt-plus" target="_blank" rel="noreferrer">ChatGPT Plus</a>, unless you use
      more than 10 million tokens per month. All messages are stored in your browser's local storage, so everything is
      <strong>private</strong>. You can also close the browser tab and come back later to continue the conversation.
    </div>
  </article>
  <article class="message" class:is-danger={!apiKey} class:is-warning={apiKey}>
    <div class="message-body">
      Set your OpenAI API key below:

      <form
        class="field has-addons has-addons-right"
        on:submit|preventDefault={(event) => {
          if (event.target && event.target[0].value) {
            apiKeyStorage.set((event.target[0].value).trim())
          } else {
            apiKeyStorage.set('') // remove api key
          }
        }}
      >
        <p class="control is-expanded">
          <input
            aria-label="OpenAI API key"
            type="password"
            autocomplete="off"
            class="input"
            class:is-danger={!apiKey}
            value={apiKey}
          />
        </p>
        <p class="control">
          <button class="button is-info" type="submit">Save</button>
        </p>


      </form>

      {#if !apiKey}
        <p class="help is-danger">
          Please enter your <a href="https://platform.openai.com/account/api-keys">OpenAI API key</a> above to use ChatGPT-web.
          It is required to use ChatGPT-web.
        </p>
      {/if}
    </div>
  </article>

  
  <article class="message" class:is-info={true}>
    <div class="message-body">
      <label class="label" for="enablePetals">
        <input 
        type="checkbox"
        class="checkbox" 
        id="enablePetals"
        checked={!!$globalStorage.enablePetals} 
        on:click={setPetalsEnabled}
      >
        Use Petals API and Models
      </label>
      {#if showPetalsSettings}
        <p>Set Petals API Endpoint:</p>
        <form
          class="field has-addons has-addons-right"
          on:submit|preventDefault={(event) => {
            if (event.target && event.target[0].value) {
              setGlobalSettingValueByKey('pedalsEndpoint', (event.target[0].value).trim())
            } else {
              setGlobalSettingValueByKey('pedalsEndpoint', '')
            }
          }}
        >
          <p class="control is-expanded">
            <input
              aria-label="PetalsAPI Endpoint"
              type="text"
              class="input"
              placeholder={getPetalsV2Websocket()}
              value={$globalStorage.pedalsEndpoint || ''}
            />
          </p>
          <p class="control">
            <button class="button is-info" type="submit">Save</button>
          </p>

          
        </form>
        <p>
          Only use <u>{getPetalsV2Websocket()}</u> for testing.  You must set up your own Petals server for actual use. 
        </p>
        <p>
          <b>Do not send sensitive information when using Petals.</b>
        </p>
        <p>
            For more information on Petals, see 
            <a href="https://github.com/petals-infra/chat.petals.dev">https://github.com/petals-infra/chat.petals.dev</a>
        </p>
      {/if}
      {#if !apiKey}
        <p class="help is-danger">
          Please enter your <a href="https://platform.openai.com/account/api-keys">OpenAI API key</a> above to use ChatGPT-web.
          It is required to use ChatGPT-web.
        </p>
      {/if}
    </div>
  </article>
  {#if apiKey}
    <article class="message is-info">
      <div class="message-body">
        Select an existing chat on the sidebar, or
        <a href={'#/chat/new'}>create a new chat</a>
      </div>
    </article>
  {/if}
</section>
<Footer pin={true} />