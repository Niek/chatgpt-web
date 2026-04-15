declare namespace svelteHTML {
  interface HTMLAttributes<T extends EventTarget = EventTarget> {
    // Custom on:modal-esc event
    'on:modal-esc'?: (event: CustomEvent<KeyboardEvent>) => void
  }
}

declare module 'stacking-order' {
  export function compare(a: Element, b: Element): number
}

declare module 'svelte-modals/legacy' {
  export const Modals: any
  export function closeModal(...args: any[]): any
  export function openModal(component: any, props?: Record<string, any>): any
}
