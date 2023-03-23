/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference types="svelte" />
/// <reference types="vite/client" />
declare module '*/prompts.csv' {
  const value: [{ act: string, prompt: string }]
  export default value
}
