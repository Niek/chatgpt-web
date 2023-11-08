<script  context="module" lang="ts">
  import { compare } from 'stacking-order'
  import { openModal } from 'svelte-modals'
  import PromptNotice from './PromptNotice.svelte'
  import { addChat, getChat } from './Storage.svelte'
  import { replace } from 'svelte-spa-router'
  // import PromptConfirm from './PromptConfirm.svelte'
  import type { ChatSettings } from './Types.svelte'
  export const sizeTextElements = (force?: boolean) => {
    const els = document.querySelectorAll('textarea.auto-size')
    for (let i:number = 0, l = els.length; i < l; i++) {
      autoGrowInput(els[i] as HTMLTextAreaElement, force)
    }
  }

  export const autoGrowInputOnEvent = (event: Event) => {
    // Resize the textarea to fit the content - auto is important to reset the height after deleting content
    if (event.target === null) return
    (event.target as any).__didAutoGrow = false
    autoGrowInput(event.target as HTMLTextAreaElement)
  }

  export const autoGrowInput = (el: HTMLTextAreaElement, force?: boolean) => {
    const anyEl = el as any // Oh how I hate typescript.  All the markup of Java with no real payoff..
    if (force || !anyEl.__didAutoGrow) el.style.height = '38px' // don't use "auto" here.  Firefox will over-size.
    el.style.height = el.scrollHeight + 'px'
    setTimeout(() => {
      if (el.scrollHeight > el.getBoundingClientRect().height + 5) {
        el.style.overflowY = 'auto'
      } else {
        el.style.overflowY = ''
      }
    }, 0)
    anyEl.__didAutoGrow = true // don't resize this one again unless it's via an event
  }

  export const scrollIntoViewWithOffset = (element:HTMLElement, offset:number, instant:boolean = false, bottom:boolean = false) => {
    const behavior = instant ? 'instant' : 'smooth'
    if (bottom) {
      window.scrollTo({
        behavior: behavior as any,
        top:
        (element.getBoundingClientRect().bottom) -
        document.body.getBoundingClientRect().top - (window.innerHeight - offset)
      })
    } else {
      window.scrollTo({
        behavior: behavior as any,
        top:
        element.getBoundingClientRect().top -
        document.body.getBoundingClientRect().top -
        offset
      })
    }
  }

  export const scrollToMessage = (uuid:string | string[] | undefined, offset:number = 60, instant:boolean = false, bottom:boolean = false) => {
    if (Array.isArray(uuid)) {
      uuid = uuid[0]
    }
    if (!uuid) {
      console.error('Not a valid uuid', uuid)
      return
    }
    const el = document.getElementById('message-' + uuid)
    if (el) {
      scrollIntoViewWithOffset(el, offset, instant, bottom)
    } else {
      console.error("Can't find element with message ID", uuid)
    }
  }

  export const scrollToBottom = (instant:boolean = false) => {
    setTimeout(() => document.querySelector('body')?.scrollIntoView({ behavior: (instant ? 'instant' : 'smooth') as any, block: 'end' }), 0)
  }


  export const checkModalEsc = (event:KeyboardEvent|undefined):boolean|void => {
    if (!event || event.key !== 'Escape') return
    dispatchModalEsc()
  }

  export const dispatchModalEsc = ():boolean|void => {
    const stack = Array.from(document.querySelectorAll('.modal, .has-esc')).filter(s =>
      window.getComputedStyle(s).getPropertyValue('display') !== 'none'
    )
    const top:HTMLElement = stack.length === 1
      ? stack[0]
      : stack.find(m1 => {
        return stack.find(m2 => {
          return m1 !== m2 && compare(m1, m2) > 0 && m1
        })
      }) as any
    if (top) {
      // trigger modal-esc event on topmost modal when esc key is pressed
      const e = new CustomEvent('modal-esc', { detail: top })
      top.dispatchEvent(e)
    }
  }

  export const encodeHTMLEntities = (rawStr:string) => {
    return rawStr.replace(/[\u00A0-\u9999<>&]/g, (i) => `&#${i.charCodeAt(0)};`)
  }

  export const errorNotice = (message:string, error:Error|undefined = undefined):any => {
    openModal(PromptNotice, {
      title: 'Error',
      class: 'is-danger',
      message: message + (error ? '<br>' + error.message : ''),
      asHtml: true,
      onConfirm: () => {}
    })
  }
  
  export const warningNotice = (message:string, error:Error|undefined = undefined):any => {
    openModal(PromptNotice, {
      title: 'Warning',
      class: 'is-warning',
      message: message + (error ? '<br>' + error.message : ''),
      asHtml: true,
      onConfirm: () => {}
    })
  }

  export const startNewChatFromChatId = (chatId: number) => {
    const newChatId = addChat(getChat(chatId).settings)
    // go to new chat
    replace(`/chat/${newChatId}`)
  }

  export const startNewChatWithWarning = (activeChatId: number|undefined, profile?: ChatSettings|undefined) => {
    const newChat = () => {
      const chatId = addChat(profile)
      replace(`/chat/${chatId}`)
    }
    // if (activeChatId && getChat(activeChatId).settings.isDirty) {
    //   openModal(PromptConfirm, {
    //     title: 'Unsaved Profile',
    //     message: '<p>There are unsaved changes to your current profile that will be lost.</p><p>Discard these changes and continue with new chat?</p>',
    //     asHtml: true,
    //     class: 'is-warning',
    //     onConfirm: () => {
    //       newChat()
    //     }
    //   })
    // } else {
    //   newChat()
    // }
    newChat()
  }

  export const valueOf = (chatId: number, value: any) => {
    if (typeof value === 'function') return value(chatId)
    return value
  }

  export const escapeRegex = (string: string): string => {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')
  }

</script> 