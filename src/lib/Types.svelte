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
    suppress?: boolean;
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
    logit_bias?: Record<string, any> | null;
    user?: string;
  };

  export type ChatSettings = {
    profile: string,
    characterName: string,
    profileName: string,
    profileDescription: string,
    useSummarization: boolean;
    summaryThreshold: number;
    summarySize: number;
    pinTop: number;
    pinBottom: number;
    summaryPrompt: string;
    useSystemPrompt: boolean;
    systemPrompt: string;
    autoStartSession: boolean;
    trainingPrompts?: Message[];
  } & Request;

  export type Chat = {
    id: number;
    name: string;
    messages: Message[];
    usage: Record<Model, Usage>;
    settings: ChatSettings;
    startSession: boolean;
    sessionStarted: boolean;
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
    lastProfile?: string;
    defaultProfile?: string;
    hideSummarized?: boolean;
  };

  type SettingNumber = {
    type: 'number';
    min: number;
    max: number;
    step: number;
  };

  export type SelectOption = {
    value: string;
    text: string;
  };

type SettingBoolean = {
  type: 'boolean';
};

  export type SettingSelect = {
    type: 'select';
    options: SelectOption[];
  };

  export type SettingText = {
    type: 'text';
  };

  export type SettingTextArea = {
    type: 'textarea';
    lines?: number;
  };

  export type SettingOther = {
    type: 'other';
  };

  export type ChatSetting = {
    key: keyof ChatSettings;
    name: string;
    title: string;
    forceApi?: boolean; // force in api requests, even if set to default
    hidden?: boolean; // Hide from setting menus
    header?: string;
    headerClass?: string;
    placeholder?: string;
    hide?: (chatId:number) => boolean;
    apiTransform?: (chatId:number, setting:ChatSetting, value:any) => any;
    setDefault?: (chatId:number, setting:ChatSetting, value:any) => any;
    beforeChange?: (chatId:number, setting:ChatSetting, value:any) => boolean;
    afterChange?: (chatId:number, setting:ChatSetting, value:any) => boolean;
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
