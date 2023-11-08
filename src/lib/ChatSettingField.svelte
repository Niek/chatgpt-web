<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  // import { getProfile } from './Profiles.svelte'
  import { cleanSettingValue, setChatSettingValue } from './Storage.svelte'
  import type { Chat, ChatSetting, ChatSettings, ControlAction, FieldControl, SettingPrompt } from './Types.svelte'
  import { autoGrowInputOnEvent, errorNotice, valueOf } from './Util.svelte'
  // import { replace } from 'svelte-spa-router'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { openModal } from 'svelte-modals'
  import PromptConfirm from './PromptConfirm.svelte'
  import { afterUpdate, onMount } from 'svelte'

  export let setting:ChatSetting
  export let chatSettings:ChatSettings
  export let chat:Chat
  export let chatDefaults:Record<string, any>
  export let originalProfile:String
  export let rkey:number = 0


  let fieldControls:ControlAction[]

  const chatId = chat.id
  let show = false

  let header = valueOf(chatId, setting.header)
  let headerClass = valueOf(chatId, setting.headerClass)
  let placeholder = valueOf(chatId, setting.placeholder)
  
  const buildFieldControls = () => {
    fieldControls = (setting.fieldControls || [] as FieldControl[]).map(fc => {
      return fc.getAction(chatId, setting, chatSettings[setting.key])
    })
  }

  buildFieldControls()

  onMount(() => {
    show = (typeof setting.hide !== 'function') || !setting.hide(chatId, setting)
    buildFieldControls()
  })

  afterUpdate(() => {
    show = (typeof setting.hide !== 'function') || !setting.hide(chatId, setting)
    header = valueOf(chatId, setting.header)
    headerClass = valueOf(chatId, setting.headerClass)
    placeholder = valueOf(chatId, setting.placeholder)
    buildFieldControls()
  })


  if (originalProfile) {
    // eventually...
  }

  const dispatch = createEventDispatcher()

  const refreshSettings = () => {
    dispatch('refresh')
  }

  const settingChecks:Record<string, SettingPrompt[]> = {
    profile: [
      {
        title: 'Unsaved Profile Changes',
        message: 'Unsaved changes to the current profile will be lost.\n Continue?',
        checkPrompt: (setting, newVal, oldVal) => {
          return !!chatSettings.isDirty && newVal !== oldVal
        },
        passed: false
      }
    ]
  }

  const resetSettingCheck = (key:keyof ChatSettings) => {
    const checks = settingChecks[key]
    checks && checks.forEach((c) => { c.passed = false })
  }

  const queueSettingValueChange = (event: Event, setting: ChatSetting) => {
    if (event.target === null) return
    const val = chatSettings[setting.key]
    const el = (event.target as HTMLInputElement)
    const doSet = () => {
      try {
        (typeof setting.beforeChange === 'function') && setting.beforeChange(chatId, setting, el.checked || el.value) &&
          refreshSettings()
      } catch (e) {
        errorNotice('Unable to change:', e)
      }
      switch (setting.type) {
        case 'boolean':
          setChatSettingValue(chatId, setting, el.checked)
          refreshSettings()
          break
        default:
          setChatSettingValue(chatId, setting, el.value)
      }
      const newVal = cleanSettingValue(setting.type, el.checked || el.value)
      if (val === newVal) return
      try {
        if ((typeof setting.afterChange === 'function') && setting.afterChange(chatId, setting, chatSettings[setting.key])) {
          // console.log('Refreshed from setting', setting.key, chatSettings[setting.key], val)
          refreshSettings()
        }
      } catch (e) {
        setChatSettingValue(chatId, setting, val)
        errorNotice('Unable to change:', e)
      }
      dispatch('change', setting)
    }
    const checks = settingChecks[setting.key] || []
    const newVal = cleanSettingValue(setting.type, el.checked || el.value)
    for (let i = 0, l = checks.length; i < l; i++) {
      const c = checks[i]
      if (c.passed) continue
      if (c.checkPrompt(setting, newVal, val)) {
        openModal(PromptConfirm, {
          title: c.title,
          message: c.message,
          class: c.class || 'is-warning',
          onConfirm: () => {
            c.passed = true
            if (c.onYes && c.onYes(setting, newVal, val)) {
              resetSettingCheck(setting.key)
            } else {
              queueSettingValueChange(event, setting)
            }
          },
          onCancel: () => {
            // roll-back
            if (!c.onNo || !c.onNo(setting, newVal, val)) {
              resetSettingCheck(setting.key)
              setChatSettingValue(chatId, setting, val)
              // refresh setting modal, if open
              c.onNo && c.onNo(setting, newVal, val)
              refreshSettings()
            } else {
              queueSettingValueChange(event, setting)
            }
          }
        })
      } else {
        c.passed = true
      }
    }
    // passed all?
    if (checks.find(c => !c.passed)) return
    resetSettingCheck(setting.key)
    doSet()
  }

</script>

{#if show}
  {#if header}
  <p class="notification {headerClass}">
    {@html header}
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
        placeholder={placeholder || ''}
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
      <div class="field" class:has-addons={fieldControls.length}>
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
            placeholder={String(placeholder || chatDefaults[setting.key])}
            on:change={e => queueSettingValueChange(e, setting)}
          />
        {:else if setting.type === 'select' || setting.type === 'select-number'}
          <!-- <div class="select"> -->
            <div class="select" class:control={fieldControls.length}>
            {#key rkey}
            <select id="settings-{setting.key}" title="{setting.title}" on:change={e => queueSettingValueChange(e, setting) } >
              {#each setting.options as option}
                <option class:is-default={option.value === chatDefaults[setting.key]} value={option.value} selected={option.value === chatSettings[setting.key]} disabled={option.disabled}>{option.text}</option>
              {/each}
            </select>
            {/key}
            </div>
            {#each fieldControls as cont}
            <div class="control">
              <button title={cont.text} on:click={() => { cont.action && cont.action(chatId, setting, chatSettings[setting.key]); refreshSettings() }} class="button {cont.class || ''}">
                {#if cont.text}
                <span class="text">
                  <Fa icon={cont.icon} />
                </span> 
                {/if}
                {#if cont.icon}
                <span class="icon">
                  <Fa icon={cont.icon} />
                </span> 
                {/if}
              </button>
            </div>
            {/each}

        {:else if setting.type === 'text'}
          <div class="field">
              <input 
              type="text"
              title="{setting.title}"
              class="input" 
              value={chatSettings[setting.key]} 
              placeholder={String(placeholder || chatDefaults[setting.key])}
              on:change={e => { queueSettingValueChange(e, setting) }}
            >
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}