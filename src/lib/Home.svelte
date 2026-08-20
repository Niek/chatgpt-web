<script lang="ts">
  import {
    apiKeyStorage,
    lastChatId,
    getApiBase,
    getApiKey,
    getChat,
    getProviderId,
    setProviderConfig,
    started,
    checkStateChange
  } from './Storage.svelte'
  import Footer from './Footer.svelte'
  import { replace } from 'svelte-spa-router'
  import { afterUpdate, onMount } from 'svelte'
  import { hasActiveModels } from './Models.svelte'
  import { getProvider, providers, type ProviderId } from './providers/openai/providers'
  import { resetSupportedModels, testProviderConnection } from './providers/openai/util.svelte'

  let providerId: ProviderId = getProviderId()
  let apiKey = getApiKey()
  let customApiBase = providerId === 'custom' ? getApiBase() : ''
  let hasModels = hasActiveModels()
  let apiError = ''
  let apiSuccess = ''
  let testing = false

  $: provider = getProvider(providerId)
  $: apiBase = providerId === 'custom' ? customApiBase : provider.apiBase

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
    $checkStateChange++
  })

  const selectProvider = (event: Event) => {
    providerId = (event.target as HTMLSelectElement).value as ProviderId
    apiError = ''
    apiSuccess = ''
  }

  const saveProvider = async () => {
    const candidateKey = apiKey.trim()
    const candidateBase = apiBase.trim()
    apiError = ''
    apiSuccess = ''

    if (!candidateKey) {
      apiError = 'Enter an API key.'
      return
    }
    if (!candidateBase) {
      apiError = 'Enter an API base URL.'
      return
    }

    testing = true
    try {
      const modelCount = await testProviderConnection({
        provider: providerId,
        apiBase: candidateBase,
        apiKey: candidateKey
      })
      setProviderConfig(providerId, candidateBase, candidateKey)
      resetSupportedModels()
      hasModels = hasActiveModels()
      apiSuccess = `Connected to ${provider.name} (${modelCount} model${modelCount === 1 ? '' : 's'} available).`
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      apiError = `Could not connect to ${provider.name}: ${message}`
    } finally {
      testing = false
    }
  }
</script>

<section class="section">
  <article class="message">
    <div class="message-body">
      <p class="mb-4">
        <strong><a href="https://github.com/Niek/chatgpt-web" target="_blank" rel="noreferrer">ChatGPT-web</a></strong>
        is a simple one-page interface for OpenAI-compatible chat APIs. Choose a provider and enter its API key below.
        Chats are stored in your browser's local storage, while prompts are sent directly to the selected provider.
      </p>
    </div>
  </article>

  <article class="message" class:is-danger={!!apiError} class:is-warning={!hasModels && !apiError} class:is-info={hasModels && !apiError}>
    <div class="message-body">
      <form on:submit|preventDefault={saveProvider}>
        <div class="field">
          <label class="label" for="api-provider">Provider</label>
          <div class="control select is-fullwidth">
            <select id="api-provider" aria-label="API provider" value={providerId} on:change={selectProvider}>
              {#each providers as option}
                <option value={option.id}>{option.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="field">
          <label class="label" for="api-key">API key</label>
          <div class="control">
            <input
              id="api-key"
              aria-label="API key"
              type="password"
              autocomplete="off"
              class="input"
              class:is-danger={!!apiError}
              bind:value={apiKey}
              placeholder="Enter your API key"
            />
          </div>
        </div>

        {#if providerId === 'custom'}
          <div class="field">
            <label class="label" for="api-base">API base URL</label>
            <div class="control">
              <input
                id="api-base"
                aria-label="API base URL"
                type="url"
                class="input"
                class:is-danger={!!apiError}
                bind:value={customApiBase}
                placeholder="https://example.com"
              />
            </div>
          </div>
        {/if}

        <div class="field">
          <div class="control">
            <button class="button is-info" type="submit" class:is-loading={testing} disabled={testing}>
              Test &amp; save
            </button>
          </div>
        </div>
      </form>

      <p class="help">
        Using <a href={provider.documentationUrl} target="_blank" rel="noreferrer">{provider.name}'s API</a> at
        <code>{apiBase}</code>. The key is stored only in this browser.
      </p>
      {#if provider.apiKeyUrl}
        <p class="help">Need a key? <a href={provider.apiKeyUrl} target="_blank" rel="noreferrer">Create one with {provider.name}</a>.</p>
      {/if}
      {#if provider.compatibilityNotice}
        <p class="help is-warning">{provider.compatibilityNotice}</p>
      {/if}
      {#if apiError}
        <p class="help is-danger" role="alert">{apiError}</p>
      {/if}
      {#if apiSuccess}
        <p class="help is-success" role="status">{apiSuccess}</p>
      {/if}
    </div>
  </article>

  {#if $apiKeyStorage}
    <article class="message is-info">
      <div class="message-body">
        Select an existing chat on the sidebar, or
        <a href="#/chat/new">create a new chat</a>
      </div>
    </article>
  {/if}
</section>
<Footer pin={true} />
