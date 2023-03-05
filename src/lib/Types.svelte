<script context="module" lang="ts">
  export type Chat = {
    id: number;
    name: string;
    messages: Message[];
  };

  export type Message = {
    role: "user" | "assistant" | "system";
    content: string;
    usage?: Usage;
  };

  export type Usage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };

  // TODO: add better type here, for now a generic JSON type
  export type Response = Record<string, any>;
</script>
