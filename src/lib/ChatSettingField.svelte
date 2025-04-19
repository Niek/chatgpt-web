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
  import { faTrash } from '@fortawesome/free-solid-svg-icons/index'
  import { getContext } from 'svelte'

  export let setting:ChatSetting
  export let chatSettings:ChatSettings
  export let chat:Chat
  export let chatDefaults:Record<string, any>
  export let originalProfile:String
  export let rkey:number = 0


  let fieldControls:ControlAction[]
  let textareaEl: HTMLTextAreaElement | null = null
  let lastTextareaValue: string | undefined

  const chatId = chat.id
  let show = false

  let header = valueOf(chatId, setting.header)
  let headerClass = valueOf(chatId, setting.headerClass)
  let placeholder = valueOf(chatId, setting.placeholder)
  let footer = typeof setting.footer === 'function' ? setting.footer(chatId) : setting.footer
  
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
    footer = typeof setting.footer === 'function' ? setting.footer(chatId) : setting.footer
    buildFieldControls()
    // Auto-grow textarea if value changed programmatically
    if (setting.type === 'textarea' && textareaEl) {
      if (lastTextareaValue !== chatSettings[setting.key]) {
        autoGrowInputOnEvent({ target: textareaEl })
        lastTextareaValue = chatSettings[setting.key]
      }
    }
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

  // Get the promptDeleteProfile function from context if provided by parent
  const promptDeleteProfile = getContext('promptDeleteProfile')

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
    <div class="field is-normal textarea-field" style="width:100%">
      <label class="label" for="settings-{setting.key}" title="{setting.title}">{setting.name}</label>
      <textarea
        bind:this={textareaEl}
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
            title={
              (setting.key === 'n' && chatSettings.stream)
                ? 'Response streaming does not support multiple answers. This setting is locked to 1 while streaming is enabled.'
                : (fieldControls && fieldControls[0] && fieldControls[0].disabled ? fieldControls[0].title : setting.title)
            }
            id="settings-{setting.key}"
            value={
              (setting.key === 'n' && chatSettings.stream)
                ? 1
                : chatSettings[setting.key]
            }
            min={setting.min}
            max={setting.max}
            step={setting.step}
            placeholder={String(placeholder || chatDefaults[setting.key])}
            on:change={e => queueSettingValueChange(e, setting)}
            disabled={
              (setting.key === 'n' && chatSettings.stream) || (fieldControls && fieldControls[0] && fieldControls[0].disabled)
            }
          />
        {:else if setting.type === 'select' || setting.type === 'select-number'}
            <div style="display: inline-flex; align-items: center;">
              <div class="field has-addons" style="margin-right: 0.5em;">
                <div class="control">
                  <div class="select" class:control={fieldControls.length}>
                    {#key rkey}
                    <select id="settings-{setting.key}" title="{setting.title}" on:change={e => queueSettingValueChange(e, setting) } >
                      {#each setting.options as option}
                        {@const isDefault = option.value === chatDefaults[setting.key]}
                        <option class:is-default={isDefault} value={option.value} selected={option.value === chatSettings[setting.key]} disabled={option.disabled}>{option.text}</option>
                      {/each}
                    </select>
                    {/key}
                  </div>
                </div>
                {#each fieldControls as cont}
                  <div class="control">
                    <button title={cont.title} on:click={() => { cont.action && cont.action(chatId, setting, chatSettings[setting.key]); refreshSettings() }} class="button {cont.class || ''}">
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
              </div>
              {#if setting.key === 'profile'}
                <button class="button is-small" style="margin-left: 0.5em;" title="Delete Profile" on:click={promptDeleteProfile}>
                  <span class="icon"><Fa icon={faTrash}/></span>
                  <span>Delete Profile</span>
                </button>
              {/if}
            </div>
            {#if footer}
            <div style="display: inline-block; margin-left: 5px; color: #888; font-size: 15px; line-height: 1.2; position: relative; top: 6px;">
              {@html footer}
            </div>
            {/if}
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
      {#if footer && setting.type !== 'select' && setting.type !== 'select-number'}
      <div class="field-footer has-text-grey is-size-12 mt-2">
        {@html footer}
      </div>
      {/if}
    </div>
  </div>
{/if}