<script  context="module" lang="ts">
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
</script> 