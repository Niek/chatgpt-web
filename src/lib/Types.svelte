<script context="module" lang="ts">
  import type { IconDefinition } from '@fortawesome/free-solid-svg-icons'
  import { supportedChatModelKeys } from './Models.svelte'
  import { ChatRequest } from './ChatRequest.svelte'
  import { ChatCompletionResponse } from './ChatCompletionResponse.svelte'

export type Model = typeof supportedChatModelKeys[number];

export type RequestType = 'chat' | 'instruct' | 'image'

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
    hideSystemPrompt: boolean;
    sendSystemPromptLast: boolean;
    autoStartSession: boolean;
    hiddenPromptPrefix: string;
    hppContinuePrompt: string; // hiddenPromptPrefix used, optional glue when trying to continue truncated completion
    hppWithSummaryPrompt: boolean; // include hiddenPromptPrefix when before summary prompt
    imageGenerationModel: Model;
    trainingPrompts?: Message[];
    useResponseAlteration?: boolean;
    responseAlterations?: ResponseAlteration[];
    startSequence: string;
    stopSequence: string;
    aggressiveStop: boolean;
    delimiter: string;
    userMessageStart: string;
    userMessageEnd: string;
    assistantMessageStart: string;
    assistantMessageEnd: string;
    leadPrompt: string;
    systemMessageStart: string;
    systemMessageEnd: string;
    repetitionPenalty: number;
    holdSocket: boolean;
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

export type ChatCompletionOpts = {
    chat: Chat;
    autoAddMessages: boolean;
    maxTokens?:number;
    summaryRequest?:boolean;
    didSummary?:boolean;
    streaming?:boolean;
    onMessageChange?: (messages: Message[]) => void;
    fillMessage?:Message;
    count?:number;
    prompt?:string;
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
    hide?: (chatId:number, setting:ChatSetting) => boolean;
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

export type ModelDetail = {
    type: RequestType;
    id?: string;
    modelQuery?: string;
    label?: string;
    start?: string;
    stop?: string[];
    delimiter?: string;
    userStart?: string,
    userEnd?: string,
    assistantStart?: string,
    assistantEnd?: string,
    systemStart?: string,
    systemEnd?: string,
    leadPrompt?: string,
    prompt?: number;
    completion?: number;
    max: number;
    opt?: Record<string, any>;
    preFillMerge?: (existingContent:string, newContent:string)=>string;
    enabled?: boolean;
    hide?: boolean;
    check: (modelDetail: ModelDetail) => Promise<void>;
    getTokens: (val: string) => number[];
    countPromptTokens: (prompts:Message[], model:Model, chat: Chat) => number;
    countMessageTokens: (message:Message, model:Model, chat: Chat) => number;
    getEndpoint: (model: Model) => string;
    help: string;
    hideSetting: (chatId: number, setting: ChatSetting) => boolean;
    request: (request: Request, chatRequest: ChatRequest, chatResponse: ChatCompletionResponse, opts: ChatCompletionOpts) => Promise<ChatCompletionResponse>;
  };

</script>
