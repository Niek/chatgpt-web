<script lang="ts">
  import Code from './Code.svelte'
  import { createEventDispatcher, onMount } from 'svelte'
  import { deleteMessage, chatsStorage } from './Storage.svelte'
  import { getPrice } from './Stats.svelte'
  import SvelteMarkdown from 'svelte-markdown'
  import type { Message, Model, Chat } from './Types.svelte'
  import Fa from 'svelte-fa/src/fa.svelte'
  import { faTrash, faDiagramPredecessor, faDiagramNext } from '@fortawesome/free-solid-svg-icons/index'

  export let message:Message
  export let chatId:number


  $: chat = $chatsStorage.find((chat) => chat.id === chatId) as Chat
  $: chatSettings = chat.settings

  // Marked options
  const markdownOptions = {
    gfm: true, // Use GitHub Flavored Markdown
    breaks: true, // Enable line breaks in markdown
    mangle: false // Do not mangle email addresses
  }

  const dispatch = createEventDispatcher()
  let editing = false
  let original:string
  let defaultModel:Model
  let noEdit:boolean

  onMount(() => {
    original = message.content
    defaultModel = chatSettings.model as any
    noEdit = !!message.summarized
  })

  const edit = (uuid:string) => {
    if (noEdit) return
    editing = true
    setTimeout(() => {
      const el = document.getElementById(uuid)
      el && el.focus()
    }, 0)
  }

  let dbnc
  const update = () => {
    clearTimeout(dbnc)
    dbnc = setTimeout(() => { doChange() }, 250)
  }

  const doChange = () => {
    if (message.content !== original) {
      dispatch('change', message)
    }
  }

  const exit = () => {
    doChange()
    editing = false
  }

  const keydown = (event:KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      message.content = original
      editing = false
    }
  }
  const scrollToMessage = (uuid:string | string[] | undefined) => {
    if (Array.isArray(uuid)) {
      uuid = uuid[0]
    }
    if (!uuid) {
      console.error('Not a valid uuid', uuid)
      return
    }
    const el = document.getElementById('message-' + uuid)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      console.error("Can't find element with message ID", uuid)
    }
  }
  
</script>

{#key message.uuid}
<article
  id="{'message-' + message.uuid}"
  class="message" 
  class:is-info={message.role === 'user'}
  class:is-success={message.role === 'assistant'}
  class:is-warning={message.role === 'system'}
  class:is-danger={message.role === 'error'}
  class:user-message={message.role === 'user' || message.role === 'system'}
  class:assistant-message={message.role === 'error' || message.role === 'assistant'}
  class:summarized={message.summarized} 
>
  <div class="message-body content">
    <div class="greyscale is-pulled-right ml-2 button-pack">
    {#if !message.summarized && !message.summary}
    <a
      href={'#'}
      class=" delButton"
      on:click|preventDefault={() => {
        // messages.splice(i, 1)
        deleteMessage(chatId, message.uuid)
      }}
    >
    <Fa icon={faTrash} />
    </a>
    {:else if message.summarized}
    <a
      href={'#'}
      class="delButton"
      on:click|preventDefault={() => {
        scrollToMessage(message.summarized)
      }}
    >
    <Fa icon={faDiagramNext} />
    </a>
    {/if}
    {#if message.summary}
    <a
      href={'#'}
      class="delButton"
      on:click|preventDefault={() => {
        scrollToMessage(message.summary)
      }}
    >
    <Fa icon={faDiagramPredecessor} />
    </a>
    {/if}
    </div>
    {#if editing && !noEdit}
      <form class="message-edit" on:submit|preventDefault={update} on:keydown={keydown}>
        <div id={'edit-' + message.uuid} class="message-editor" bind:innerText={message.content} contenteditable on:input={update} on:blur={exit} />
      </form>
    {:else}
      <div 
        class="message-display" 
          on:dblclick|preventDefault={() => edit('edit-' + message.uuid)}
        >
        <SvelteMarkdown 
          source={message.content} 
          options={markdownOptions} 
          renderers={{ code: Code, html: Code }}
        />
    </div>
    {/if}
    {#if message.role === 'system'}
      <p class="is-size-7 message-note">System Prompt</p>
    {:else if message.usage}
      <p class="is-size-7 message-note">
        <em>{message.model || defaultModel}</em> using <span class="has-text-weight-bold">{message.usage.total_tokens}</span>
        tokens ~= <span class="has-text-weight-bold">${getPrice(message.usage, message.model || defaultModel).toFixed(6)}</span>
      </p>
    {/if}
  </div>
</article>
{/key}

<style>
  .message-note {
    padding-top: .6em;
    margin-bottom: -0.6em;
    opacity: 0.5;
  }
  .message-edit {
    display: block;
  }
  .message-editor {
    white-space: pre-wrap;
    min-width: 100px;
    min-height: 30px;
  }
  .button-pack {
    display: none;
    position: absolute;
    right: 10px;
    top: 2px;
    text-decoration: none;
  }
  .assistant-message .button-pack {    
    right: auto;
    left: 5px;
    top: 2px;
  }
  .message {
    position: relative;
  }
  .message:hover .button-pack, .message:focus .button-pack {
    display: block;
  }
  .summarized {
    opacity: 0.6;
  }
</style>
