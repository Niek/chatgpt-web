<script context="module" lang="ts">
  export type Chat = {
    id: number;
    name: string;
    messages: Message[];
  };

  export type Message = {
    role: "user" | "assistant" | "system" | "error";
    content: string;
    usage?: Usage;
  };

  export type Usage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };

  export type Request = {
    model: "gpt-3.5-turbo" | "gpt-3.5-turbo-0301";
    messages: Message[];
    temperature?: number;
    top_p?: number;
    n?: number;
    stream?: boolean;
    stop?: string | null;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, any>;
    user?: string;
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
