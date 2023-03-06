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

  type ResponseOK = {
    status: "ok";
    id: string;
    object: string;
    created: number;
    choices: {
      index: number;
      message: Message;
      finish_reason: string;
    }[];
    usage: Usage;
  };

  type ResponseError = {
    status: "error";
    error: {
      message: string;
      type?: string;
      param?: string | null;
      code?: string | null;
    };
  };

  export type Response = ResponseOK | ResponseError;
</script>
