<script context="module" lang="ts">
    import { applyProfile } from './Profiles.svelte'
    import { getChatSettings, getGlobalSettings, setGlobalSettingValueByKey } from './Storage.svelte'
    import { encode } from 'gpt-tokenizer'
    import { faCheck, faThumbTack } from '@fortawesome/free-solid-svg-icons/index'
// Setting definitions

import {
      type ChatSettings,
      type ChatSetting,
      type SettingSelect,
      type GlobalSetting,
      type GlobalSettings,
      type Request,
      type Model,

      type ControlAction

} from './Types.svelte'

export const defaultModel:Model = 'gpt-3.5-turbo'

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
  model: defaultModel,
  messages: [],
  temperature: 1,
  top_p: 1,
  n: 1,
  stream: true,
  stop: null,
  max_tokens: 512,
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
  // useResponseAlteration: false,
  // responseAlterations: [],
  isDirty: false
}

const excludeFromProfile = {
  messages: true,
  user: true,
  isDirty: true
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
        applyProfile(chatId)
        return true // Signal we should refresh the setting modal
      },
      fieldControls: [{
        getAction: (chatId, setting, value) => {
          if (value === getGlobalSettings().defaultProfile) {
            return {
              title: 'This profile is currently your default',
              icon: faCheck
            } as ControlAction
          } else {
            return {
              title: 'Set this profile as your default',
              icon: faThumbTack,
              class: 'is-info',
              action: (chatId, setting, value) => {
                setGlobalSettingValueByKey('defaultProfile', value)
              }
            } as ControlAction
          }
        }
      }]
}

// Settings that will not be part of the API request
const systemPromptSettings: ChatSetting[] = [
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
      }
]

const summarySettings: ChatSetting[] = [
      {
        key: 'useSummarization',
        name: 'Enable Continuous Chat',
        header: 'Continuous Chat - (Summarize or FIFO)',
        headerClass: 'is-info',
        title: 'When out of token space, summarize or remove past prompts and keep going.',
        type: 'boolean'
      },
      {
        key: 'summaryThreshold',
        name: 'Token Threshold',
        title: 'When prompt history breaks this threshold, past prompts will be summarized or rolled off to create space.',
        min: 0,
        max: 32000,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!
      },
      {
        key: 'summarySize',
        name: 'Max Summary Size',
        title: 'Maximum number of tokens allowed for summary response.',
        min: 128,
        max: 2048,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!
      },
      {
        key: 'pinTop',
        name: 'Keep First Prompts',
        title: 'When we run out of space and need to remove prompts, the top number of prompts will not be removed after summarization/FIFO.',
        min: 0,
        max: 4,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!

      },
      {
        key: 'pinBottom',
        name: 'Keep Bottom Prompts',
        title: 'When we run out of space and need to remove prompts, do not remove or summarize the the last number prompts you set here.',
        min: 0,
        max: 20, // Will be auto adjusted down if needs more
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!

      },
      {
        key: 'summaryPrompt',
        name: 'Summary Generation Prompt (Empty will use FIFO instead.)',
        title: 'A prompt used to summarize past prompts.',
        placeholder: 'Enter a prompt that will be used to summarize past prompts here.',
        type: 'textarea',
        hide: (chatId) => !getChatSettings(chatId).useSummarization!
      }
]

// const responseAlterationSettings: ChatSetting[] = [
//       {
//         key: 'useResponseAlteration',
//         name: 'Alter Responses',
//         header: 'Automatic Response Alteration',
//         headerClass: 'is-info',
//         title: 'When an undesired response is encountered, try to alter it in effort to improve future responses.',
//         type: 'boolean',
//         hide: () => true
//       },
//       {
//         key: 'responseAlterations',
//         name: 'Alterations',
//         title: 'Add find/replace or re-prompts.',
//         header: 'Profile / Presets',
//         headerClass: 'is-info',
//         settings: [
//           {
//             key: 'type',
//             type: 'select',
//             name: 'Alteration Type',
//             default: 'replace',
//             options: [{
//               value: 'replace',
//               text: 'Regexp Find / Replace'
//             }, {
//               value: 'prompt',
//               text: 'Re-prompt with Instructions'
//             }]
//           },
//           {
//             key: 'match',
//             type: 'text',
//             name: 'Match Expression',
//             title: 'Regular expression used to match '
//           },
//           {
//             key: 'replace',
//             type: 'text',
//             name: 'Alteration',
//             title: 'Regexp Replacement or Re-prompt'
//           }
//         ],
//         type: 'subset',
//         hide: (chatId) => !getChatSettings(chatId).useResponseAlteration!
//       }
// ]

const modelSetting: ChatSetting & SettingSelect = {
      key: 'model',
      name: 'Model',
      title: 'The model to use - GPT-3.5 is cheaper, but GPT-4 is more powerful.',
      header: 'Below are the settings that OpenAI allows to be changed for the API calls. See the <a target="_blank" href="https://platform.openai.com/docs/api-reference/chat/create">OpenAI API docs</a> for more details.',
      headerClass: 'is-warning',
      options: [],
      type: 'select',
      forceApi: true, // Need to make sure we send this
      afterChange: (chatId, setting) => true // refresh settings
}

const chatSettingsList: ChatSetting[] = [
      profileSetting,
      ...systemPromptSettings,
      ...summarySettings,
      // ...responseAlterationSettings,
      modelSetting,
      {
        key: 'stream',
        name: 'Stream Response',
        title: 'Stream responses as they are generated.',
        type: 'boolean'
      },
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
        step: 1,
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
        // transform to word->weight pairs to token(s)->weight.
        //  -- care should be taken to have each word key in the each record formatted in a way where they
        //     only take one token each else you'll end up with results you probably don't want.
        //     Generally, leading space plus common lower case word will more often result in a single token
        //     See: https://platform.openai.com/tokenizer
        apiTransform: (chatId, setting, val:Record<string, number>) => {
          // console.log('logit_bias', val, getChatSettings(chatId).logit_bias)
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
      },
      {
        key: 'hideSummarized',
        name: 'Hide Summarized Messages',
        type: 'boolean'
      }
]

const globalSettingLookup:Record<string, GlobalSetting> = globalSettingsList.reduce((a, v) => {
      if (a[v.key]) console.error(`${a[v.key]} is defined more than once in Global Settings.`)
      a[v.key] = v
      return a
}, {} as Record<string, GlobalSetting>)

</script>