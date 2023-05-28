<script context="module" lang="ts">
    import { applyProfile } from './Profiles.svelte'
    import { getChatSettings } from './Storage.svelte'
    import { encode } from 'gpt-tokenizer'
// Setting definitions

import {
      type ChatSettings,
      type ChatSetting,
      type SettingSelect,
      type GlobalSetting,
      type GlobalSettings,
      type Request
} from './Types.svelte'

export const getChatSettingList = (): ChatSetting[] => {
      return chatSettingsList
}

export const getRequestSettingList = (): ChatSetting[] => {
      return chatSettingsList.filter(s => s.key in gptDefaults)
}

export const getChatSettingObjectByKey = (key: keyof ChatSettings): ChatSetting => {
      const result = chatSettingLookup[key]
      if (!result) console.error(`Chat Setting "${key}" not defined in Settings array.`)
      return result
}

export const getGlobalSettingList = (): GlobalSetting[] => {
      return globalSettingsList
}

export const getGlobalSettingObjectByKey = (key: keyof GlobalSettings): GlobalSetting => {
      return globalSettingLookup[key]
}

export const getRequestDefaults = ():Request => {
  return gptDefaults
}

export const getChatDefaults = ():ChatSettings => {
  return defaults
}

export const getExcludeFromProfile = () => {
  return excludeFromProfile
}

const gptDefaults = {
  model: 'gpt-3.5-turbo-0301',
  messages: [],
  temperature: 1,
  top_p: 1,
  n: 1,
  stream: false,
  stop: null,
  max_tokens: 128,
  presence_penalty: 0,
  frequency_penalty: 0,
  logit_bias: null,
  user: undefined
}

// Core set of defaults
const defaults:ChatSettings = {
  ...gptDefaults,
  profile: '',
  characterName: 'ChatGPT',
  profileName: '',
  profileDescription: '',
  useSummarization: false,
  summaryThreshold: 3000,
  summarySize: 1000,
  pinTop: 0,
  pinBottom: 6,
  summaryPrompt: '',
  useSystemPrompt: false,
  systemPrompt: '',
  autoStartSession: false,
  trainingPrompts: [],
  // There are chat session state variables, and really don't belong here
  // But it was easier to just put them here.
  startSession: false, // Should the session start automatically
  sessionStarted: false // Has the session started (user made a first request)
}

const excludeFromProfile = {
  messages: true,
  startSession: true,
  sessionStarted: true,
  user: true
}

const profileSetting: ChatSetting & SettingSelect = {
      key: 'profile',
      name: 'Profile',
      title: 'Choose how you want your assistant to act.',
      header: 'Profile / Presets',
      headerClass: 'is-info',
      options: [], // Set by Profiles
      type: 'select',
      afterChange: (chatId, setting) => {
        applyProfile(chatId, '', !getChatSettings(chatId).sessionStarted)
        return true // Signal we should refresh the setting modal
      }
}

// Settings that will not be part of the API request
const nonRequestSettings: ChatSetting[] = [
      profileSetting,
      {
        key: 'profileName',
        name: 'Profile Name',
        title: 'How this profile is displayed in the select list.',
        type: 'text'
        // hide: (chatId) => { return !getChatSettingValueByKey(chatId, 'useSystemPrompt') }
      },
      {
        key: 'profileDescription',
        name: 'Description',
        title: 'How this profile is displayed in the select list.',
        type: 'textarea'
        // hide: (chatId) => { return !getChatSettingValueByKey(chatId, 'useSystemPrompt') }
      },
      {
        key: 'useSystemPrompt',
        name: 'Use Profile/System Prompt',
        title: 'Send a "System" prompt as the first prompt.',
        header: 'System Prompt',
        headerClass: 'is-info',
        type: 'boolean'
      },
      {
        key: 'characterName',
        name: 'Character Name',
        title: 'What the personality of this profile will be called.',
        type: 'text',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt
      },
      {
        key: 'systemPrompt',
        name: 'System Prompt',
        title: 'First prompt to send.',
        placeholder: 'Enter the first prompt to send here.',
        type: 'textarea',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt
      },
      {
        key: 'trainingPrompts',
        name: 'Training Prompts',
        title: 'Prompts used to train.',
        type: 'other',
        hide: (chatId) => true
      },
      {
        key: 'autoStartSession',
        name: 'Auto-Start Session',
        title: 'If possible, auto-start the chat session, sending a system prompt to get an initial response.',
        type: 'boolean',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt
      },
      {
        key: 'startSession',
        name: 'Auto-Start Trigger',
        title: '',
        type: 'boolean',
        hide: (chatId) => true
      },
      {
        key: 'useSummarization',
        name: 'Enable Auto Summarize',
        header: 'Continuous Chat - Summarization',
        headerClass: 'is-info',
        title: 'When out of token space, summarize past tokens and keep going.',
        type: 'boolean'
      },
      {
        key: 'summaryThreshold',
        name: 'Summary Threshold',
        title: 'When prompt history breaks this threshold, past prompts will be summarized to create space. 0 to disable.',
        min: 0,
        max: 32000,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!
      },
      {
        key: 'summarySize',
        name: 'Max Summary Size',
        title: 'Maximum number of tokens to use for summarization response.',
        min: 128,
        max: 2048,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!
      },
      {
        key: 'pinTop',
        name: 'Keep First Prompts During Summary',
        title: 'When we run out of space and need to summarize prompts, the top number of prompts will not be removed after summarization.',
        min: 0,
        max: 4,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!

      },
      {
        key: 'pinBottom',
        name: 'Exclude Bottom Prompts From Summary',
        title: 'When we run out of space and need to summarize prompts, do not summarize the the last number prompts you set here.',
        min: 0,
        max: 20, // Will be auto adjusted down if needs more
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!

      },
      {
        key: 'summaryPrompt',
        name: 'Summary Generation Prompt',
        title: 'A prompt used to summarize past prompts.',
        placeholder: 'Enter a prompt that will be used to summarize past prompts here.',
        type: 'textarea',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!
      }
]

const modelSetting: ChatSetting & SettingSelect = {
      key: 'model',
      name: 'Model',
      title: 'The model to use - GPT-3.5 is cheaper, but GPT-4 is more powerful.',
      header: 'Below are the settings that OpenAI allows to be changed for the API calls. See the <a target="_blank" href="https://platform.openai.com/docs/api-reference/chat/create">OpenAI API docs</a> for more details.',
      headerClass: 'is-warning',
      options: [],
      type: 'select',
      forceApi: true // Need to make sure we send this
}

const chatSettingsList: ChatSetting[] = [
      ...nonRequestSettings,
      modelSetting,
      {
        key: 'temperature',
        name: 'Sampling Temperature',
        title: 'What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.\n' +
              '\n' +
              'We generally recommend altering this or top_p but not both.',
        min: 0,
        max: 2,
        step: 0.1,
        type: 'number'
      },
      {
        key: 'top_p',
        name: 'Nucleus Sampling',
        title: 'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.\n' +
              '\n' +
              'We generally recommend altering this or temperature but not both',
        min: 0,
        max: 1,
        step: 0.1,
        type: 'number'
      },
      {
        key: 'n',
        name: 'Number of Messages',
        title: 'CAREFUL WITH THIS ONE: How many chat completion choices to generate for each input message. This can eat tokens.',
        min: 1,
        max: 10,
        step: 1,
        type: 'number'
      },
      {
        key: 'max_tokens',
        name: 'Max Tokens',
        title: 'The maximum number of tokens to generate in the completion.\n' +
              '\n' +
              'The token count of your prompt plus max_tokens cannot exceed the model\'s context length. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).\n',
        min: 1,
        max: 32768,
        step: 1024,
        type: 'number',
        forceApi: true // Since default here is different than gpt default, will make sure we always send it
      },
      {
        key: 'presence_penalty',
        name: 'Presence Penalty',
        title: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model\'s likelihood to talk about new topics.',
        min: -2,
        max: 2,
        step: 0.2,
        type: 'number'
      },
      {
        key: 'frequency_penalty',
        name: 'Frequency Penalty',
        title: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model\'s likelihood to repeat the same line verbatim.',
        min: -2,
        max: 2,
        step: 0.2,
        type: 'number'
      },
      {
        // logit bias editor not implemented yet
        key: 'logit_bias',
        name: 'Logit Bias',
        title: 'Allows you to adjust bias of tokens used in completion.',
        header: 'Logit Bias. See <a target="_blank" href="https://help.openai.com/en/articles/5247780-using-logit-bias-to-define-token-probability">this article</a> for more details.',
        type: 'other',
        hide: () => true,
        // transform to JSON for request, first converting word->weight pairs to token(s)->weight.
        //  -- care should be taken to have each word key in the each record formatted in a way where they
        //     only take one token each else you'll end up with results you probably don't want.
        //     Generally, leading space plus common lower case word will more often result in a single token
        //     See: https://platform.openai.com/tokenizer
        apiTransform: (chatId, setting, val:Record<string, number>) => {
          console.log('logit_bias', val, getChatSettings(chatId).logit_bias)
          if (!val) return null
          const tokenized:Record<number, number> = Object.entries(val).reduce((a, [k, v]) => {
            const tokens:number[] = encode(k)
            tokens.forEach(t => { a[t] = v })
            return a
          }, {} as Record<number, number>)
          return tokenized
        }
      },
      // Enable?
      {
        key: 'user',
        name: 'User?',
        title: 'Name of user?',
        type: 'text',
        hide: () => true
      }
]

const chatSettingLookup:Record<string, ChatSetting> = chatSettingsList.reduce((a, v) => {
      if (a[v.key]) console.error(`${a[v.key]} is defined more than once in Chat Settings.`)
      a[v.key] = v
      return a
}, {} as Record<string, ChatSetting>)


const globalSettingsList:GlobalSetting[] = [
      {
        key: 'lastProfile',
        name: 'Last Profile',
        type: 'text'
      },
      {
        key: 'defaultProfile',
        name: 'Default Profile',
        type: 'text'
      }
]

const globalSettingLookup:Record<string, GlobalSetting> = globalSettingsList.reduce((a, v) => {
      if (a[v.key]) console.error(`${a[v.key]} is defined more than once in Global Settings.`)
      a[v.key] = v
      return a
}, {} as Record<string, GlobalSetting>)

</script>