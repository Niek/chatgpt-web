<script context="module" lang="ts">
  // import type internal from "stream";

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
    total: number;
    model?: Model;
  };

  export type Message = {
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    uuid: string;
    usage?: Usage;
    model?: Model;
    removed?: boolean;
    summarized?: string[];
    summary?: string[];
  };

  export type Request = {
    model?: Model;
    messages?: Message[];
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

  export type ChatSettings = {
    profile?: string,
    characterName?: string,
    profileName?: string,
    profileDescription?: string,
    useSummarization?: boolean;
    summaryThreshold?: number;
    summarySize?: number;
    pinTop?: number,
    pinBottom?: number,
    summaryPrompt?: string;
    useSystemPrompt?: boolean;
    systemPrompt?: string;
    autoStartSession?: boolean;
    startSession?: false;
    trainingPrompts?: Message[];
  } & Request;

  export type Chat = {
    id: number;
    name: string;
    messages: Message[];
    usage?: Usage[];
    settings: ChatSettings;
  };

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

  export type GlobalSettings = {
    profiles: Record<string, ChatSettings>;
    lastProfile?: string,
    defaultProfile?: string,
  };

  type SettingNumber = {
    type: 'number';
    default: number;
    min: number;
    max: number;
    step: number;
  };

  type SettingBoolean = {
    type: 'boolean';
    default: boolean;
  };

  export type SelectOption = {
    value: string;
    text: string;
  };

  export type SettingSelect = {
    type: 'select';
    default: string;
    options: SelectOption[];
  };

  export type SettingText = {
    type: 'text';
    default: string;
  };

  export type SettingTextArea = {
    type: 'textarea';
    lines?: number;
    default: string;
    placeholder?: string;
  };

  export type SettingOther = {
    type: 'other';
    default: any;
  };

  export type ChatSetting = {
    key: keyof ChatSettings;
    name: string;
    title: string;
    required?: boolean; // force in request
    noRequest?: boolean; // exclude from request
    hidden?: boolean; // Hide from setting menus
    header?: string;
    headerClass?: string;
    hide?: (number?) => boolean;
    setFilter?: (number, ChatSetting?, any?) => any;
    getFilter?: (number, ChatSetting?, any?) => any;
    afterChange?: (number, ChatSetting?, any?) => boolean;
  } & (SettingNumber | SettingSelect | SettingBoolean | SettingText | SettingTextArea | SettingOther);

  export type GlobalSetting = {
    key: keyof GlobalSettings;
    name?: string;
    title?: string;
    required?: boolean; // force in request
    hidden?: boolean; // Hide from setting menus
    header?: string;
    headerClass?: string;
  } & (SettingNumber | SettingSelect | SettingBoolean | SettingText | SettingOther);

</script>
