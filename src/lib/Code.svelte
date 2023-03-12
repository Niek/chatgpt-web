<script lang="ts">
  import { Highlight } from "svelte-highlight";

  // Import both dark and light styles
  import { github, githubDark } from "svelte-highlight/styles";

  // Style depends on system theme
  const style = window.matchMedia("(prefers-color-scheme: dark)").matches ? githubDark : github;

  // Copy function for the code block
  import copy from "copy-to-clipboard";
  import { afterUpdate } from "svelte";

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

  // For copying code
  // reference: https://vyacheslavbasharov.com/blog/adding-click-to-copy-code-markdown-blog
  const copyFunction = () => {
    const codeBlocks = document.querySelectorAll("pre");
    const showCopyMessage = "Copy";
    codeBlocks.forEach((block) => {
      const copyPrompt = document.createElement("div");
      copyPrompt.className = "copy-prompt";
      const copyPromptText = document.createElement("button");
      copyPromptText.classList.add("button", "is-light", "is-outlined", "is-small", "is-responsive");
      copyPromptText.innerHTML = showCopyMessage;
      copyPrompt.appendChild(copyPromptText);
      block.appendChild(copyPrompt);
      block.querySelector(".copy-prompt > button").addEventListener("click", (evt) => {
        copy(block.querySelector("code").textContent);
        block.querySelector(".copy-prompt > button").innerHTML = "Copied!";
        setTimeout(() => {
          block.querySelector(".copy-prompt > button").innerHTML = showCopyMessage;
        }, 1000);
      });
    });
  };

  afterUpdate(() => {
    copyFunction();
  })

</script>

<svelte:head>
  {@html style}
</svelte:head>

<Highlight code={text} {language} />
