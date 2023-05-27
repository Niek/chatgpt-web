<script context="module" lang="ts">
    import { applyProfile } from './Profiles.svelte'
    import { getChatSettingValue, getChatSettingValueByKey } from './Storage.svelte'
// Setting definitions

import {
      type ChatSettings,
      type ChatSetting,
      type SettingSelect,
      type GlobalSetting,
      type GlobalSettings
} from './Types.svelte'

export const getChatSettingList = (): ChatSetting[] => {
      return chatSettingsList
}

export const getChatSettingByKey = (key: keyof ChatSettings): ChatSetting => {
      const result = chatSettingLookup[key]
      if (!result) console.error(`Chat Setting "${key}" not defined in Settings array.`)
      return result
}

export const getGlobalSettingList = (): GlobalSetting[] => {
      return globalSettingsList
}

export const getGlobalSettingByKey = (key: keyof GlobalSettings): GlobalSetting => {
      return globalSettingLookup[key]
}

const profileSetting: ChatSetting & SettingSelect = {
      key: 'profile',
      name: 'Profile',
      default: '', // Set by Profiles
      title: 'Choose how you want your assistant to act.',
      header: 'Profile / Presets',
      headerClass: 'is-info',
      options: [], // Set by Profiles
      type: 'select',
      afterChange: (chatId, setting) => {
        applyProfile(chatId, getChatSettingValue(chatId, setting))
        return true // Signal we should refresh the setting modal
      },
      noRequest: true
}

// Settings that will not be part of the API request
const nonRequestSettings: ChatSetting[] = [
      profileSetting,
      {
        key: 'profileName',
        name: 'Profile Name',
        default: '', // Set by Profiles
        title: 'How this profile is displayed in the select list.',
        type: 'text',
        noRequest: true // not part of request API
        // hide: (chatId) => { return !getChatSettingValueByKey(chatId, 'useSystemPrompt') }
      },
      {
        key: 'profileDescription',
        name: 'Description',
        default: '', // Set by Profiles
        title: 'How this profile is displayed in the select list.',
        type: 'textarea',
        noRequest: true // not part of request API
        // hide: (chatId) => { return !getChatSettingValueByKey(chatId, 'useSystemPrompt') }
      },
      {
        key: 'useSystemPrompt',
        name: 'Use Profile/System Prompt',
        default: false,
        title: 'Send a "System" prompt as the first prompt.',
        header: 'System Prompt',
        headerClass: 'is-info',
        type: 'boolean',
        noRequest: true // not part of request API
      },
      {
        key: 'characterName',
        name: 'Character Name',
        default: '', // Set by Profiles
        title: 'What the personality of this profile will be called.',
        type: 'text',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSystemPrompt')
      },
      {
        key: 'systemPrompt',
        name: 'System Prompt',
        default: '', // Set by Profiles
        title: 'First prompt to send.',
        placeholder: 'Enter the first prompt to send here.',
        type: 'textarea',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSystemPrompt')
      },
      {
        key: 'trainingPrompts',
        name: 'Training Prompts',
        title: 'Prompts used to train.',
        default: null,
        type: 'other',
        noRequest: true, // not part of request API
        hide: (chatId) => true
      },
      {
        key: 'autoStartSession',
        name: 'Auto-Start Session',
        default: false,
        title: 'If possible, auto-start the chat session, sending a system prompt to get an initial response.',
        type: 'boolean',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSystemPrompt')
      },
      {
        key: 'startSession',
        name: 'Auto-Start Trigger',
        default: false,
        title: '',
        type: 'boolean',
        noRequest: true, // not part of request API
        hide: (chatId) => true
      },
      {
        key: 'useSummarization',
        name: 'Enable Auto Summarize',
        header: 'Continuous Chat - Summarization',
        headerClass: 'is-info',
        default: false,
        title: 'When out of token space, summarize past tokens and keep going.',
        type: 'boolean',
        noRequest: true // not part of request API
      },
      {
        key: 'summaryThreshold',
        name: 'Summary Threshold',
        default: 3000,
        title: 'When prompt history breaks this threshold, past prompts will be summarized to create space. 0 to disable.',
        min: 0,
        max: 32000,
        step: 1,
        type: 'number',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSummarization')
      },
      {
        key: 'summarySize',
        name: 'Max Summary Size',
        default: 512,
        title: 'Maximum number of tokens to use for summarization response.',
        min: 128,
        max: 2048,
        step: 1,
        type: 'number',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSummarization')
      },
      {
        key: 'pinTop',
        name: 'Keep First Prompts During Summary',
        default: 0,
        title: 'When we run out of space and need to summarize prompts, the top number of prompts will not be removed after summarization.',
        min: 0,
        max: 4,
        step: 1,
        type: 'number',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSummarization')

      },
      {
        key: 'pinBottom',
        name: 'Exclude Bottom Prompts From Summary',
        default: 6,
        title: 'When we run out of space and need to summarize prompts, do not summarize the the last number prompts you set here.',
        min: 0,
        max: 20, // Will be auto adjusted down if needs more
        step: 1,
        type: 'number',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSummarization')

      },
      {
        key: 'summaryPrompt',
        name: 'Summary Generation Prompt',
        default: '', // Set by Profiles
        title: 'A prompt used to summarize past prompts.',
        placeholder: 'Enter a prompt that will be used to summarize past prompts here.',
        type: 'textarea',
        noRequest: true, // not part of request API
        hide: (chatId) => !getChatSettingValueByKey(chatId, 'useSummarization')
      }
]

const modelSetting: ChatSetting & SettingSelect = {
      key: 'model',
      name: 'Model',
      default: 'gpt-3.5-turbo-0301',
      title: 'The model to use - GPT-3.5 is cheaper, but GPT-4 is more powerful.',
      header: 'Below are the settings that OpenAI allows to be changed for the API calls. See the <a target="_blank" href="https://platform.openai.com/docs/api-reference/chat/create">OpenAI API docs</a> for more details.',
      headerClass: 'is-warning',
      options: [],
      type: 'select',
      required: true
}

const chatSettingsList: ChatSetting[] = [
      ...nonRequestSettings,
      modelSetting,
      {
        key: 'temperature',
        name: 'Sampling Temperature',
        default: 1,
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
        default: 1,
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
        default: 1,
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
        default: 128,
        min: 1,
        max: 32768,
        step: 1024,
        type: 'number',
        required: true // Since default here is different than gpt default, will make sure we always send it
      },
      {
        key: 'presence_penalty',
        name: 'Presence Penalty',
        default: 0,
        title: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model\'s likelihood to talk about new topics.',
        min: -2,
        max: 2,
        step: 0.2,
        type: 'number'
      },
      {
        key: 'frequency_penalty',
        name: 'Frequency Penalty',
        default: 0,
        title: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model\'s likelihood to repeat the same line verbatim.',
        min: -2,
        max: 2,
        step: 0.2,
        type: 'number'
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
        default: 'default',
        type: 'text'
      },
      {
        key: 'defaultProfile',
        name: 'Default Profile',
        default: 'default',
        type: 'text'
      }
]

const globalSettingLookup:Record<string, GlobalSetting> = globalSettingsList.reduce((a, v) => {
      if (a[v.key]) console.error(`${a[v.key]} is defined more than once in Global Settings.`)
      a[v.key] = v
      return a
}, {} as Record<string, GlobalSetting>)

</script>