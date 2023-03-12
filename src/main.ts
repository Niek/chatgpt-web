// This can be false if you're using a fallback (i.e. SPA mode)
export const prerender = false;

import "./app.scss";
import App from "./App.svelte";

const app = new App({
  target: document.getElementById("app"),
});

export default app;
