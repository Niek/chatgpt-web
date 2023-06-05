<script lang="ts">
  import Fa from 'svelte-fa/src/fa.svelte'
  import { closeModal } from 'svelte-modals'
  import {
    faExclamation
  } from '@fortawesome/free-solid-svg-icons/index'
  import { onMount } from 'svelte'
  import { v4 as uuidv4 } from 'uuid'

  // provided by <Modals />
  export let isOpen:boolean

  export let title:string
  export let label:string
  export let value:any

  export let onSubmit:(value:any)=>boolean|void
  export let onClose:(()=>boolean|void) = () => {}
  export let saveButton:string = 'Save'
  export let closeButton:string = 'Cancel'
  export let placeholder:string = ''
  export let error:string = ''
  export let icon:Fa|null = null

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
<div class="modal is-active">
<form action="{'#'}" on:submit|preventDefault={() => { doSubmit(value) }}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-background" on:click={doClose} />
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">{title}</p>
      <button class="delete" aria-label="close" type="button" on:click={doClose}></button>
    </header>
    <section class="modal-card-body">
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
    </section>
    <footer class="modal-card-foot">
      <input type="submit" class="button is-info" value="{saveButton}" />
      <button class="button" type="button" on:click={doClose} >{closeButton}</button>
    </footer>
  </div>
</form>
</div>
{/if}
<!-- 
<svelte:window
  on:keydown={(event) => {
    if (event.key === 'Escape') {
      closeModal()
    }
  }}
/> -->
