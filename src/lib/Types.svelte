<script context="module" lang="ts">
  export type Chat = {
    id: number;
    messages: Message[];
  };

  export type Message = {
    id: number;
    role: "user" | "assistant" | "system";
    content: string;
    usage?: Usage;
    parentId?: number;
    children?: Message[];
    timestamp: number;
  };

  export type Usage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };

  // TODO: add better type here, for now a generic JSON type
  export type Response = Record<string, any>;
</script>
