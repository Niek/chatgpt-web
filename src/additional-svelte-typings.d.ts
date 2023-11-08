declare namespace svelteHTML {
  interface HTMLAttributes<> {
    // Custom on:modal-esc event
    'on:modal-esc'?: (event: any) => any
  }
}
