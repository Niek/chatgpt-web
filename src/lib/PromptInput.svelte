<script lang="ts">
  import Fa from 'svelte-fa/src/fa.svelte'
  import { closeModal } from 'svelte-modals'
  import {
    faExclamation
  } from '@fortawesome/free-solid-svg-icons/index'
  import { onMount } from 'svelte'
  import { v4 as uuidv4 } from 'uuid'

  export let isOpen:boolean

  export let title:string
  export let label:string
  export let value:any

  export let onSubmit:(value:any)=>boolean|void
  export let onClose:(()=>boolean|void) = () => {}

  export let saveButton:string = 'Save'
  export let saveButtonClass:string = 'is-info'
  export let closeButton:string = 'Cancel'
  export let closeButtonClass:string = ''
  export let placeholder:string = ''
  export let error:string = ''
  export let icon:Fa|null = null
  let classes:string = ''
  export { classes as class }

  const id = uuidv4()

  onMount(async () => {
    const input = document.getElementById(id)
    input && input.focus()
  })

  const doClose = () => {
    if (!onClose || !onClose()) closeModal()
  }

  const doSubmit = (value) => {
    onSubmit(value)
    closeModal()
  }

</script>

{#if isOpen}
<div class="modal is-active" on:modal-esc={doClose}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-background" on:click={doClose} />
  <div class="modal-content nomax">
    <form action="{'#'}" on:submit|preventDefault={() => { doSubmit(value) }}> 
    <article class="message {classes}">
      <div class="message-header">
        <p>{title}</p>
        <button class="delete" aria-label="close" type="button" on:click={doClose}></button>
      </div>
        <div class="message-body">        
          <div class="field">
            <label class="label" for="text-input">{label}</label>
            <div class="control" class:has-icons-left={icon} class:has-icons-right={error} >
              <input id={id} name="text-input" class="input" class:is-danger={error} type="text" placeholder={placeholder} bind:value={value}>
              {#if icon}
              <span class="icon is-small is-left">
                <Fa icon={icon}/>
              </span>
              {/if}
              {#if error}
              <span class="icon is-small is-right">
                <Fa icon={faExclamation}/>
                <i class="fas fa-exclamation-triangle"></i>
              </span>
              {/if}
            </div>
            {#if error}
            <p class="help is-danger">{error}</p>
            {/if}
          </div>
        </div>
        <div class="message-footer">
          <div class="level is-mobile">
            <div class="level-right">
            </div>
            <div class="level-right">
              <div class="level-item">
                <input type="submit" class="button {saveButtonClass}" value="{saveButton}" />
              </div>
              <div class="level-item">      
                <button class="button {closeButtonClass}" type="button" on:click={doClose} >{closeButton}</button>
              </div>
            </div>
          </div>
        </div>     
      </article>
    </form>  
  </div>
</div>
{/if}
