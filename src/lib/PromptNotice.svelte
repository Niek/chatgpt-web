<script lang="ts">
  import { closeModal } from 'svelte-modals'

  export let isOpen:boolean

  export let title:string
  export let message:string
  export let asHtml:boolean = false

  export let onConfirm:(()=>boolean|void)|null = null

  export let confirmButton:string = 'Close'
  export let confirmButtonClass:string = 'is-info'
  let classes:string = ''
  export { classes as class }

  const doConfirm = () => {
    if (!onConfirm || !onConfirm()) closeModal()
  }

</script>

{#if isOpen}
<div class="modal is-active" on:modal-esc={doConfirm}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="modal-background" on:click={doConfirm} />
  <div class="modal-content nomax">
    <article class="message {classes}">
      <div class="message-header">
        <p>{title}</p>
        <button class="delete" aria-label="close" type="button" on:click={doConfirm}></button>
      </div>
      <div class="message-body">
        {#if asHtml}{@html message}{:else}{message}{/if}
      </div>
      <div class="message-footer">
        <div class="level is-mobile">
          <div class="level-right">
          </div>
          <div class="level-right">
            <div class="level-item">
              <button class="button {confirmButtonClass}" type="button" on:click={doConfirm} >{confirmButton}</button>
            </div>
          </div>
        </div>
      </div>     
    </article>
  </div>
</div>
{/if}
