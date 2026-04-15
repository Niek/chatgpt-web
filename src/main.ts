// This can be false if you're using a fallback (i.e. SPA mode)
import './app.scss'
import { mount } from 'svelte'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app') as HTMLElement
})

export default app
