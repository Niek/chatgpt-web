<script  context="module" lang="ts">
  import { compare } from 'stacking-order'
  import { openModal } from 'svelte-modals'
  import PromptNotice from './PromptNotice.svelte'
  export const sizeTextElements = () => {
    const els = document.querySelectorAll('textarea.auto-size')
    for (let i:number = 0, l = els.length; i < l; i++) autoGrowInput(els[i] as HTMLTextAreaElement)
  }

  export const autoGrowInputOnEvent = (event: Event) => {
    // Resize the textarea to fit the content - auto is important to reset the height after deleting content
    if (event.target === null) return
    (event.target as any).__didAutoGrow = false
    autoGrowInput(event.target as HTMLTextAreaElement)
  }

  export const autoGrowInput = (el: HTMLTextAreaElement) => {
    const anyEl = el as any // Oh how I hate typescript.  All the markup of Java with no real payoff..
    if (!anyEl.__didAutoGrow) el.style.height = '38px' // don't use "auto" here.  Firefox will over-size.
    el.style.height = el.scrollHeight + 'px'
    anyEl.__didAutoGrow = true // don't resize this one again unless it's via an event
  }

  export const scrollIntoViewWithOffset = (element:HTMLElement, offset:number) => {
    window.scrollTo({
      behavior: 'smooth',
      top:
        element.getBoundingClientRect().top -
        document.body.getBoundingClientRect().top -
        offset
    })
  }

  export const checkModalEsc = (event:KeyboardEvent|undefined):boolean|void => {
    if (!event || event.key !== 'Escape') return
    dispatchModalEsc()
  }

  export const dispatchModalEsc = ():boolean|void => {
    const stack = Array.from(document.querySelectorAll('.modal')).filter(s =>
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

</script> 