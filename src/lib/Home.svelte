<script lang="ts">
  import { apiKeyStorage, globalStorage, lastChatId, getChat, started, setGlobalSettingValueByKey, checkStateChange } from './Storage.svelte'
  import Footer from './Footer.svelte'
  import { replace } from 'svelte-spa-router'
  import { afterUpdate, onMount } from 'svelte'
  import { getPetalsBase, getPetalsWebsocket } from './ApiUtil.svelte'
  import { set as setOpenAI } from './providers/openai/util.svelte'
  import { hasActiveModels } from './Models.svelte'
  import { get } from 'svelte/store'

  $: apiKey = $apiKeyStorage
  const openAiEndpoint = $globalStorage.openAiEndpoint || ''
  let showPetalsSettings = $globalStorage.enablePetals
  let pedalsEndpoint = $globalStorage.pedalsEndpoint
  let hasModels = hasActiveModels()
  let apiError: string = ''

  onMount(() => {
    if (!$started) {
      $started = true
      if (hasActiveModels() && getChat($lastChatId)) {
        const chatId = $lastChatId
        $lastChatId = 0
        replace(`/chat/${chatId}`)
      }
    }
    $lastChatId = 0
  })

  afterUpdate(() => {
    hasModels = hasActiveModels()
    pedalsEndpoint = $globalStorage.pedalsEndpoint
    $checkStateChange++
  })

  const setPetalsEnabled = (event: Event) => {
    const el = (event.target as HTMLInputElement)
    setGlobalSettingValueByKey('enablePetals', !!el.checked)
    showPetalsSettings = $globalStorage.enablePetals
    hasModels = hasActiveModels()
  }

  async function testApiEndpoint (baseUri: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUri}/v1/models`, {
        headers: { Authorization: `Bearer ${get(apiKeyStorage)}` }
      })
      if (!response.ok) {
        apiError = `There was an error connecting to this endpoint: ${response.statusText}`
        return false
      }
      apiError = ''
      return true
    } catch (error) {
      console.error('Failed to connect:', error)
      apiError = `There was an error connecting to this endpoint: ${error.message}`
      return false
    }
  }
</script>

<section class="section">
  <article class="message">
    <div class="message-body">
      <p class="mb-4">
        <strong><a href="https://github.com/Niek/chatgpt-web" target="_blank">ChatGPT-web</a></strong>
        is a simple one-page web interface to the OpenAI ChatGPT API...
      </p>
      <p>As an alternative to OpenAI, you can enter your own OpenAI-compatible API endpoint, or use Petals swarm...</p>
    </div>
  </article>

  <article class="message" class:is-danger={!hasModels} class:is-warning={!apiKey} class:is-info={apiKey}>
    <div class="message-body">
      Set your OpenAI API key below:
      <form
        class="field has-addons has-addons-right"
        on:submit|preventDefault={async (event) => {
          let val = ''
          if (event.target && event.target[0].value) {
            val = (event.target[0].value).trim()
          }
          setOpenAI({ apiKey: val })
          hasModels = hasActiveModels()
        }}
      >
        <p class="control is-expanded">
          <input
            aria-label="OpenAI API key"
            type="password"
            autocomplete="off"
            class="input"
            class:is-danger={!hasModels}
            class:is-warning={!apiKey}
            class:is-info={apiKey}
            value={apiKey}
          />
        </p>
        <p class="control">
          <button class="button is-info" type="submit">Save</button>
        </p>
      </form>

      {#if !apiKey}
        <p class:is-danger={!hasModels} class:is-warning={!apiKey}>
          Please enter your <a target="_blank" href="https://platform.openai.com/account/api-keys">OpenAI API key</a> above to use OpenAI's ChatGPT API. At least one API must be enabled to use ChatGPT-web.
        </p>
      {/if}
    </div>
  </article>

  <article class="message" class:is-danger={!hasModels || apiError} class:is-warning={!openAiEndpoint} class:is-info={openAiEndpoint && !apiError}>
    <div class="message-body">
      Set the API BASE URI for alternative OpenAI-compatible endpoints:
      <form
        class="field has-addons has-addons-right"
        on:submit|preventDefault={async (event) => {
          let val = ''
          if (event.target && event.target[0].value) {
            val = (event.target[0].value).trim()
          }
          if (await testApiEndpoint(val)) {
            setGlobalSettingValueByKey('openAiEndpoint', val)
          }
        }}
      >
        <p class="control is-expanded">
          <input
            aria-label="API BASE URI"
            type="text"
            class="input"
            class:is-danger={apiError}
            placeholder="https://api.openai.com"
            value={openAiEndpoint}
          />
        </p>
        <p class="control">
          <button class="button is-info" type="submit">Save</button>
        </p>
      </form>
      {#if apiError}
        <p class:is-danger={apiError}>{apiError}</p>
      {/if}
    </div>
  </article>

  <article class="message" class:is-danger={!hasModels} class:is-warning={!showPetalsSettings} class:is-info={showPetalsSettings}>
    <div class="message-body">
      <label class="label" for="enablePetals">
        <input 
          type="checkbox"
          class="checkbox" 
          id="enablePetals"
          checked={!!$globalStorage.enablePetals} 
          on:click={setPetalsEnabled}
        >
        Use Petals API and Models (Llama 2)
      </label>
      {#if showPetalsSettings}
        <p>Set Petals API Endpoint:</p>
        <form
          class="field has-addons has-addons-right"
          on:submit|preventDefault={(event) => {
            if (event.target && event.target[0].value) {
              const v = event.target[0].value.trim()
              const v2 = v.replace(/^https:/i, 'wss:').replace(/(^wss:\/\/[^/]+)\/*$/i, '$1' + getPetalsWebsocket())
              setGlobalSettingValueByKey('pedalsEndpoint', v2)
              event.target[0].value = v2
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
              placeholder={getPetalsBase() + getPetalsWebsocket()}
              value={$globalStorage.pedalsEndpoint || ''}
            />
          </p>
          <p class="control">
            <button class="button is-info" type="submit">Save</button>
          </p>
        </form>
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
