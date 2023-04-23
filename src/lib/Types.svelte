<script context="module" lang="ts">
  export type Model = string;

  export type Usage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };

  export type Message = {
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    usage?: Usage;
    model?: Model;
  };

  export type Chat = {
    id: number;
    name: string;
    messages: Message[];
    systemText?: Message;
  };

  export type Request = {
    model?: Model;
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

  type SettingsNumber = {
    type: 'number';
    default: number;
    min: number;
    max: number;
    step: number;
  };

  export type SettingsSelect = {
    type: 'select';
    default: Model;
    options: Model[];
  };
  export type SettingsToggle = {
    type: 'checkbox';
    default: Boolean;
  };

  export type Settings = {
    key: string;
    name: string;
    title: string;
  } & (SettingsNumber | SettingsSelect | SettingsToggle);

  type ResponseOK = {
    id: string;
    object: string;
    created: number;
    choices: {
      index: number;
      message: Message;
      finish_reason: string;
    }[];
    usage: Usage;
    model: Model;
  };
  type ResponseDelta = {
    id: string;
    object: string;
    created: number;
    choices: {
      delta:{
        role?: 'user' | 'assistant' | 'system' | 'error';
        content?: string;
      }
      }[];
    usage: Usage;
    model: Model;
  };

  type ResponseError = {
    error: {
      message: string;
      type?: string;
      param?: string | null;
      code?: string | null;
    };
  };

  export type Response = ResponseOK & ResponseError & ResponseDelta;

  export type ResponseModels = {
    object: 'list';
    data: {
      id: string;
    }[];
  };
</script>
