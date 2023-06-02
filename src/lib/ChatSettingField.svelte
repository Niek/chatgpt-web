<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { getProfile } from './Profiles.svelte'
  import { setChatSettingValue } from './Storage.svelte'
  import type { Chat, ChatSetting, ChatSettings } from './Types.svelte'
  import { autoGrowInputOnEvent } from './Util.svelte'

  export let setting:ChatSetting
  export let chatSettings:ChatSettings
  export let chat:Chat
  export let chatDefaults:Record<string, any>

  const chatId = chat.id

  const dispatch = createEventDispatcher()

  const refreshSettings = () => {
    dispatch('refresh')
  }
  
  let debounce:any

  const queueSettingValueChange = (event: Event, setting: ChatSetting) => {
    clearTimeout(debounce)
    if (event.target === null) return
    const val = chatSettings[setting.key]
    const el = (event.target as HTMLInputElement)
    const doSet = () => {
      try {
        (typeof setting.beforeChange === 'function') && setting.beforeChange(chatId, setting, el.checked || el.value) &&
          refreshSettings()
      } catch (e) {
        window.alert('Unable to change:\n' + e.message)
      }
      switch (setting.type) {
        case 'boolean':
          setChatSettingValue(chatId, setting, el.checked)
          refreshSettings()
          break
        default:
          setChatSettingValue(chatId, setting, el.value)
      }
      const newVal = chatSettings[setting.key]
      if (val === newVal) return
      try {
        (typeof setting.afterChange === 'function') && setting.afterChange(chatId, setting, chatSettings[setting.key]) &&
          refreshSettings()
      } catch (e) {
        setChatSettingValue(chatId, setting, val)
        window.alert('Unable to change:\n' + e.message)
      }
      dispatch('change', setting)
    }
    if (setting.key === 'profile' && chat.sessionStarted &&
      (getProfile(el.value).characterName !== chatSettings.characterName)) {
      const val = chatSettings[setting.key]
      if (window.confirm('Personality change will not correctly apply to existing chat session.\n Continue?')) {
        doSet()
      } else {
        // roll-back
        setChatSettingValue(chatId, setting, val)
        // refresh setting modal, if open
        refreshSettings()
      }
    }
    debounce = setTimeout(doSet, 250)
  }

</script>

{#if (typeof setting.hide !== 'function') || !setting.hide(chatId)}
  {#if setting.header}
  <p class="notification {setting.headerClass}">
    {@html setting.header}
  </p>
  {/if}
  <div class="field is-horizontal">
    {#if setting.type === 'boolean'}
    <div class="field is-normal">
      <label class="label" for="settings-{setting.key}" title="{setting.title}">
        <input 
        type="checkbox"
        title="{setting.title}"
        class="checkbox" 
        id="settings-{setting.key}"
        checked={!!chatSettings[setting.key]} 
        on:click={e => queueSettingValueChange(e, setting)}
      >
        {setting.name}
      </label>
    </div>
    {:else if setting.type === 'textarea'}
    <div class="field is-normal" style="width:100%">
      <label class="label" for="settings-{setting.key}" title="{setting.title}">{setting.name}</label>
      <textarea
        class="input is-info is-focused chat-input auto-size"
        placeholder={setting.placeholder || ''}
        rows="1"
        on:input={e => autoGrowInputOnEvent(e)}
        on:change={e => { queueSettingValueChange(e, setting); autoGrowInputOnEvent(e) }}
      >{chatSettings[setting.key]}</textarea>
    </div>
    {:else}
    <div class="field-label is-normal">
      <label class="label" for="settings-{setting.key}" title="{setting.title}">{setting.name}</label>
    </div>
    {/if}
    <div class="field-body">
      <div class="field">
        {#if setting.type === 'number'}
          <input
            class="input"
            inputmode="decimal"
            type={setting.type}
            title="{setting.title}"
            id="settings-{setting.key}"
            value={chatSettings[setting.key]}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            placeholder={String(setting.placeholder)}
            on:change={e => queueSettingValueChange(e, setting)}
          />
        {:else if setting.type === 'select'}
          <div class="select">
            <select id="settings-{setting.key}" title="{setting.title}" on:change={e => queueSettingValueChange(e, setting) } >
              {#each setting.options as option}
                <option class:is-default={option.value === chatDefaults[setting.key]} value={option.value} selected={option.value === chatSettings[setting.key]}>{option.text}</option>
              {/each}
            </select>
          </div>
        {:else if setting.type === 'text'}
          <div class="field">
              <input 
              type="text"
              title="{setting.title}"
              class="input" 
              value={chatSettings[setting.key]} 
              on:change={e => { queueSettingValueChange(e, setting) }}
            >
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}