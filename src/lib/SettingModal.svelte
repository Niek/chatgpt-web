<script lang="ts">
import { onMount } from 'svelte'
import { apiBase, modelSetting, settingsMap, supportedModels } from './Settings.svelte'
import { apiKeyStorage } from './Storage.svelte'
import type { ResponseModels } from './Types.svelte'

export let settings: HTMLDivElement

const closeSettings = () => {
  settings.classList.remove('is-active')
}

const clearSettings = () => {
  settingsMap.forEach((setting) => {
    const input = settings.querySelector(`#settings-${setting.key}`) as HTMLInputElement
    input.value = ''
  })
}

onMount(async () => {
  // Load available models from OpenAI
  const allModels = (await (
    await fetch(apiBase + '/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${$apiKeyStorage}`,
        'Content-Type': 'application/json'
      }
    })
  ).json()) as ResponseModels
  const filteredModels = supportedModels.filter((model) => allModels.data.find((m) => m.id === model))

  // Update the models in the settings
  modelSetting.options = filteredModels
}
)

</script>
<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') {
      closeSettings()
    }
}}
/>;
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal" bind:this={settings}>
  <div class="modal-background" on:click={closeSettings} />
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Settings</p>
    </header>
    <section class="modal-card-body">
      <p class="notification is-warning">Below are the settings that OpenAI allows to be changed for the API calls. See the <a href="https://platform.openai.com/docs/api-reference/chat/create">OpenAI API docs</a> for more details.</p>
      {#each settingsMap as setting}
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label" for="settings-{setting.key}">{setting.name}</label>
          </div>
          <div class="field-body">
            <div class="field">
              {#if setting.type === 'number'}
                <input
                  class="input"
                  inputmode="decimal"
                  type={setting.type}
                  title="{setting.title}"
                  id="settings-{setting.key}"
                  min={setting.min}
                  max={setting.max}
                  step={setting.step}
                  placeholder={String(setting.default)}
                />
              {:else if setting.type === 'select'}
                <div class="select">
                  <select id="settings-{setting.key}" title="{setting.title}">
                    {#each setting.options as option}
                      <option value={option} selected={option === setting.default}>{option}</option>
                    {/each}
                  </select>
                </div>
              {:else }
                <div class={setting.type}>
                  <input  
                      id="settings-{setting.key}" 
                      title="{setting.title}"
                      type={setting.type} 
                      value={true}
                  />
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </section>

    <footer class="modal-card-foot">
      <button class="button is-info" on:click={closeSettings}>Close settings</button>
      <button class="button" on:click={clearSettings}>Clear settings</button>
    </footer>
  </div>
</div>


