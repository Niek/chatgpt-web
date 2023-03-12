<script lang="ts">
  import { Highlight } from "svelte-highlight";

  // Import both dark and light styles
  import { github, githubDark } from "svelte-highlight/styles";

  // Style depends on system theme
  const style = window.matchMedia("(prefers-color-scheme: dark)").matches ? githubDark : github;

  // Import all supported languages
  import {
    javascript,
    python,
    typescript,
    ruby,
    go,
    java,
    sql,
    shell,
    php,
    plaintext,
    type LanguageType,
  } from "svelte-highlight/languages";

  export const type: "code" = "code";
  export const raw: string = "";
  export const codeBlockStyle: "indented" | undefined = undefined;
  export let lang: string | undefined = undefined;
  export let text: string;

  // Map lang string to LanguageType
  let language: LanguageType<string>;
  switch (lang) {
    case "js":
    case "javascript":
      language = javascript;
      break;
    case "py":
    case "python":
      language = python;
      break;
    case "ts":
    case "typescript":
      language = typescript;
      break;
    case "rb":
    case "ruby":
      language = ruby;
      break;
    case "go":
    case "golang":
      language = go;
      break;
    case "java":
      language = java;
      break;
    case "sql":
      language = sql;
      break;
    case "sh":
    case "shell":
    case "bash":
      language = shell;
      break;
    case "php":
      language = php;
      break;
    default:
      language = plaintext;
  }
</script>

<svelte:head>
  {@html style}
</svelte:head>

<Highlight code={text} {language} />
