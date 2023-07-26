<script context="module" lang="ts">
    import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { supportedModelKeys } from './Models.svelte'
import { imageGenerationSizeTypes } from './Settings.svelte'

export type Model = typeof supportedModelKeys[number];

export type ImageGenerationSizes = typeof imageGenerationSizeTypes[number];

export type RequestType = 'OpenAIChat' | 'OpenAIDall-e' | 'Petals'

export type ModelDetail = {
    type: RequestType;
    label?: string;
    stop?: string[];
    userStart?: string,
    assistantStart?: string,
    systemStart?: string,
    prompt: number;
    completion: number;
    max: number;
  };

export type Usage = {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };

export interface ChatImage {
    id: string;
    b64image: string;
    chats: number[];
  }

export type Message = {
    role: 'user' | 'assistant' | 'system' | 'error' | 'image';
    content: string;
    uuid: string;
    usage?: Usage;
    model?: Model;
    removed?: boolean;
    summarized?: string[];
    summary?: string[];
    suppress?: boolean;
    finish_reason?: string;
    streaming?: boolean;
    image?: ChatImage;
    created?: number;
    skipOnce?: boolean;
    appendOnce?: string[];
  };

export type ResponseAlteration = {
    type: 'prompt' | 'replace';
    match: string;
    replace: string;
  }

export type ResponseImageDetail = {
    url: string;
    b64_json: string;
  }

export type ResponseImage = {
    created: number;
    data: ResponseImageDetail[];
  }

export type RequestImageGeneration = {
    prompt: string;
    n?: number;
    size?: ImageGenerationSizes;
    response_format?: keyof ResponseImageDetail;
  }

export type Request = {
    model: Model;
    messages?: Message[];
    temperature?: number;
    top_p?: number;
    n?: number;
    stream?: boolean;
    stop?: string | null;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    logit_bias?: Record<string, number> | null;
    user?: string;
  };

export type ChatSettings = {
    profile: string,
    characterName: string,
    profileName: string,
    profileDescription: string,
    continuousChat: (''|'fifo'|'summary');
    summaryThreshold: number;
    summarySize: number;
    summaryExtend: number;
    summaryTemperature: number;
    pinTop: number;
    pinBottom: number;
    summaryPrompt: string;
    useSystemPrompt: boolean;
    systemPrompt: string;
    sendSystemPromptLast: boolean;
    autoStartSession: boolean;
    hiddenPromptPrefix: string;
    hppContinuePrompt: string; // hiddenPromptPrefix used, optional glue when trying to continue truncated completion
    hppWithSummaryPrompt: boolean; // include hiddenPromptPrefix when before summary prompt
    imageGenerationSize: ImageGenerationSizes;
    trainingPrompts?: Message[];
    useResponseAlteration?: boolean;
    responseAlterations?: ResponseAlteration[];
    stopSequence: string;
    aggressiveStop: boolean;
    userMessageStart: string;
    assistantMessageStart: string;
    systemMessageStart: string;
    isDirty?: boolean;
  } & Request;

export type Chat = {
    id: number;
    name: string;
    messages: Message[];
    usage: Record<Model, Usage>;
    settings: ChatSettings;
    startSession: boolean;
    sessionStarted: boolean;
    created: number;
    lastUse: number;
    lastAccess: number;
  };

  type ResponseOK = {
    id?: string;
    object?: string;
    created?: number;
    choices?: {
      index?: number;
      message: Message;
      finish_reason?: string;
      delta: Message;
    }[];
    usage?: Usage;
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

export type ChatCompletionOpts = {
    chat: Chat;
    autoAddMessages: boolean;
    maxTokens?:number;
    summaryRequest?:boolean;
    didSummary?:boolean;
    streaming?:boolean;
    onMessageChange?: (messages: Message[]) => void;
    fillMessage?:Message,
  };

export type ChatSortOptions = 'name'|'created'|'lastUse'|'lastAccess';

export type GlobalSettings = {
    profiles: Record<string, ChatSettings>;
    lastProfile: string|null;
    defaultProfile: string;
    hideSummarized: boolean;
    chatSort: ChatSortOptions;
    openAICompletionEndpoint: string;
    enablePetals: boolean;
    pedalsEndpoint: string;
  };

  type SettingNumber = {
    type: 'number';
    min: number;
    max: number;
    step: number;
  };

export type SelectOption = {
    value: string|number;
    text: string;
    disabled?: boolean;
  };

export type ChatSortOption = SelectOption & {
    sortFn: (a: Chat, b: Chat) => number;
    icon: IconDefinition;
  };

  type SettingBoolean = {
    type: 'boolean';
  };

export type SettingSelect = {
    type: 'select';
    options: SelectOption[];
  };

export type SettingSelectNumber = {
    type: 'select-number';
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

export type ControlAction = {
    title:string;
    icon?:any,
    text?:string;
    class?:string;
    disabled?:boolean;
    action?: (chatId:number, setting:any, value:any) => any;
  };

export type FieldControl = {
    getAction: (chatId:number, setting:any, value:any) => ControlAction;
  };

export type SubSetting = {
    type: 'subset';
    settings: any[];
  };

export type ValueFn = (chatId:number) => string

export type ChatSetting = {
    key: keyof ChatSettings;
    name: string;
    title: string;
    forceApi?: boolean; // force in api requests, even if set to default
    hidden?: boolean; // Hide from setting menus
    header?: string | ValueFn;
    headerClass?: string | ValueFn;
    placeholder?: string | ValueFn;
    hide?: (chatId:number) => boolean;
    apiTransform?: (chatId:number, setting:ChatSetting, value:any) => any;
    fieldControls?: FieldControl[];
    beforeChange?: (chatId:number, setting:ChatSetting, value:any) => boolean;
    afterChange?: (chatId:number, setting:ChatSetting, value:any) => boolean;
  } & (SettingNumber | SettingSelect | SettingSelectNumber | SettingBoolean | SettingText | SettingTextArea | SettingOther | SubSetting);


export type GlobalSetting = {
    key: keyof GlobalSettings;
    name?: string;
    title?: string;
    required?: boolean; // force in request
    hidden?: boolean; // Hide from setting menus
    header?: string;
    headerClass?: string;
  } & (SettingNumber | SettingSelect | SettingBoolean | SettingText | SettingOther);

export type SettingPrompt = {
    title: string;
    message: string;
    class?: string;
    checkPrompt: (setting:ChatSetting, newVal:any, oldVal:any)=>boolean;
    onYes?: (setting:ChatSetting, newVal:any, oldVal:any)=>boolean;
    onNo?: (setting:ChatSetting, newVal:any, oldVal:any)=>boolean;
    passed: boolean;
  };

</script>
