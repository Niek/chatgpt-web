<script context="module" lang="ts">
  export type Chat = {
    id: number;
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
</script>
