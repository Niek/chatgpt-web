<script lang="ts">
  // Disabled for now - it blows up the size too much
  import { HighlightAuto } from "svelte-highlight";
  import style from "svelte-highlight/styles/edge-light";

  export let type: "code";
  export let raw: string;
  export let codeBlockStyle: "indented" | undefined = undefined;
  export let lang: string | undefined = undefined;
  export let text: string;

  // Disable warnings
  type = "code";
  raw;
  codeBlockStyle;
  lang;
</script>

<svelte:head>
  {@html style}
</svelte:head>

<HighlightAuto code={text} />
