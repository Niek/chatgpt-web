<script context="module" lang="ts">
  export const supportedModels = [ // See: https://platform.openai.com/docs/models/model-endpoint-compatibility
    'gpt-4',
    'gpt-4-0314',
    'gpt-4-32k',
    'gpt-4-32k-0314',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-0301'
  ]
  export type Model = typeof supportedModels[number];

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
    timeTaken?: number;
  };

  export type Chat = {
    id: number;
    name: string;
    messages: Message[];
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

  export type Settings = {
    key: string;
    name: string;
    title: string;
  } & (SettingsNumber | SettingsSelect);

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

  type ResponseError = {
    error: {
      message: string;
      type?: string;
      param?: string | null;
      code?: string | null;
    };
  };

  export type Response = ResponseOK & ResponseError;

  export type ResponseModels = {
    object: 'list';
    data: {
      id: string;
    }[];
  };
</script>
