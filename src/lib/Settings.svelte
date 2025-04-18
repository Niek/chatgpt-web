<script context="module" lang="ts">
    import { applyProfile } from './Profiles.svelte'
    import { get } from 'svelte/store'
    import { apiKeyStorage, getChatSettings, getGlobalSettings, setGlobalSettingValueByKey, setChatSettingValueByKey } from './Storage.svelte'
    import { faArrowDown91, faArrowDownAZ, faCheck, faThumbTack } from '@fortawesome/free-solid-svg-icons/index'
// Setting definitions

import {
      type ChatSettings,
      type ChatSetting,
      type SettingSelect,
      type GlobalSetting,
      type GlobalSettings,
      type Request,
      type Model,
      type ControlAction,

      type ChatSortOption

} from './Types.svelte'
import { getChatModelOptions, getModelDetail, getTokens } from './Models.svelte'

// We are adding default model names explicitly here to avoid
// circular dependencies. Alternative would be a big refactor,
// which we want to avoid for now.
export const getDefaultModel = async (): Promise<Model> => {
  if (!get(apiKeyStorage)) return 'stabilityai/StableBeluga2'

  const models = await getChatModelOptions()

  return models[0].text
}

export const getChatSettingList = (): ChatSetting[] => {
      return chatSettingsList
}

export const getRequestSettingList = (): ChatSetting[] => {
      return chatSettingsList.filter(s => s.key in gptDefaults)
}

export const hasChatSetting = (key: keyof ChatSettings): boolean => {
      return !!chatSettingLookup[key]
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

const hideModelSetting = (chatId, setting) => {
  return getModelDetail(getChatSettings(chatId).model).hideSetting(chatId, setting)
}

const gptDefaults = {
  model: 'chatgpt-4o-latest',
  messages: [],
  temperature: 1,
  top_p: 1,
  n: 1,
  stream: true,
  stop: null,
  max_completion_tokens: null,
  presence_penalty: 0,
  frequency_penalty: 0,
  logit_bias: null,
  user: undefined,
  store: false
}

// Core set of defaults
const defaults:ChatSettings = {
  ...gptDefaults,
  profile: '',
  characterName: 'ChatGPT',
  profileName: '',
  profileDescription: '',
  continuousChat: 'fifo',
  summaryThreshold: 10000,
  summarySize: 1000,
  summaryExtend: 0,
  summaryTemperature: 0.1,
  pinTop: 0,
  pinBottom: 6,
  summaryPrompt: '',
  useSystemPrompt: false,
  systemPrompt: '',
  hideSystemPrompt: false,
  sendSystemPromptLast: false,
  autoStartSession: false,
  trainingPrompts: [],
  hiddenPromptPrefix: '',
  hppContinuePrompt: '',
  hppWithSummaryPrompt: false,
  imageGenerationModel: '',
  startSequence: '',
  stopSequence: '',
  aggressiveStop: true,
  delimiter: '',
  userMessageStart: '',
  userMessageEnd: '',
  assistantMessageStart: '',
  assistantMessageEnd: '',
  systemMessageStart: '',
  systemMessageEnd: '',
  leadPrompt: '',
  repetitionPenalty: 1.1,
  holdSocket: true,
  store: false,
  service_tier: 'flex',
  reasoning_effort: 'medium',
  isDirty: false
}

export const globalDefaults: GlobalSettings = {
  profiles: {} as Record<string, ChatSettings>,
  lastProfile: 'default',
  defaultProfile: 'default',
  hideSummarized: false,
  chatSort: 'created',
  openAICompletionEndpoint: '',
  enablePetals: false,
  pedalsEndpoint: '',
  openAiEndpoint: 'https://api.openai.com',
  apiTransform: (chatId, setting, val:Record<string, number>) => {
        if (!val) return null
        const tokenized:Record<number, number> = Object.entries(val).reduce((a, [k, v]) => {
          const tokens:number[] = getTokens(getChatSettings(chatId).model, k)
          tokens.forEach(t => { a[t] = v })
          return a
        }, {} as Record<number, number>)
        return tokenized
  }
}

const excludeFromProfile = {
  messages: true,
  user: true,
  isDirty: true
}

export const chatSortOptions = {
  name: { text: 'Name', icon: faArrowDownAZ, value: '', sortFn: (a, b) => { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0 } },
  created: { text: 'Created', icon: faArrowDown91, value: '', sortFn: (a, b) => { return ((b.created || 0) - (a.created || 0)) || (b.id - a.id) } },
  lastUse: { text: 'Last Use', icon: faArrowDown91, value: '', sortFn: (a, b) => { return ((b.lastUse || 0) - (a.lastUse || 0)) || (b.id - a.id) } },
  lastAccess: { text: 'Last View', icon: faArrowDown91, value: '', sortFn: (a, b) => { return ((b.lastAccess || 0) - (a.lastAccess || 0)) || (b.id - a.id) } }
} as Record<string, ChatSortOption>

Object.entries(chatSortOptions).forEach(([k, o]) => { o.value = k })

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
        key: 'useSystemPrompt',
        name: 'Use Character / System Prompt',
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
        placeholder: 'Enter the first prompt to send here. You can tell ChatGPT how to act.',
        type: 'textarea',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt
      },
  // Useless now, needs to be cleaned up
  //      {
  //        key: 'sendSystemPromptLast',
  //        name: 'Send System Prompt Last (Can help in gpt 3.5 in some edge cases)',
  //        title: 'ChatGPT 3.5 can often forget the System Prompt. Sending the system prompt at the end instead of the start of the messages can help.',
  //        type: 'boolean'
  //      },
      {
        key: 'hiddenPromptPrefix',
        name: 'Hidden Prompts Prefix',
        title: 'Prompts that will be silently injected before every new user prompt, then removed from history.',
        placeholder: 'Enter user prompt prefix here.  You can remind ChatGPT how to act.  Use ::EOM:: to separate messages.',
        type: 'textarea',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt
      },
      {
        key: 'hppContinuePrompt',
        name: 'Continue Truncation Prompt',
        title: 'If using Hidden Prompts Prefix, a prompt that can be used to help continue a truncated completion.',
        placeholder: 'Enter something like [Continue your response below:]',
        type: 'textarea',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt || !(getChatSettings(chatId).hiddenPromptPrefix || '').trim()
      },
      {
        key: 'hppWithSummaryPrompt',
        name: 'Use Hidden Prompt Prefix before Summary Prompt',
        title: 'If using Hidden Prompts Prefix, should it also be included before the summary request',
        placeholder: 'Enter something like [Continue your response below:]',
        type: 'boolean',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt || !(getChatSettings(chatId).hiddenPromptPrefix || '').trim()
      },
      {
        key: 'trainingPrompts',
        name: 'Training Prompts',
        title: 'Prompts used to train.',
        type: 'other',
        hide: (chatId) => true
      },
      {
        key: 'hideSystemPrompt',
        name: 'Hide System Prompt',
        title: 'Don\'t show system prompt when displaying message stream.',
        type: 'boolean',
        hide: (chatId) => !getChatSettings(chatId).useSystemPrompt
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
        key: 'continuousChat',
        name: 'Continuous Chat',
        header: 'Continuous Chat',
        headerClass: 'is-info',
        title: 'When out of token space, summarize or remove past prompts and keep going.',
        type: 'select',
        options: [
          { value: '', text: 'OFF - Chat errors when token buffer full' },
          { value: 'fifo', text: 'FIFO - First message in is first out' },
          { value: 'summary', text: 'Summary - Summarize past messages' }
        ],
        afterChange: (chatId, setting) => true // refresh settings
      },
      {
        key: 'summaryThreshold',
        name: 'Token Threshold',
        title: 'When prompt history breaks this threshold, past prompts will be summarized or rolled off to create space.',
        min: 0,
        max: 32000,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).continuousChat
      },
      {
        key: 'summarySize',
        name: 'Max Summary Size',
        title: 'Maximum number of tokens allowed for summary response.',
        min: 128,
        max: 1024,
        step: 1,
        type: 'number',
        hide: (chatId) => getChatSettings(chatId).continuousChat !== 'summary'
      },
      {
        key: 'summaryExtend',
        name: 'Summary Extend',
        title: 'Number of times a truncated summary can be extended.',
        type: 'select-number',
        options: [
          { value: 0, text: '0 - Summary must fit in first call.' },
          { value: 1, text: '1 - Allow one extra API call to extend.' },
          { value: 2, text: '2 - Allow two extra API calls to extend.' }
        ],
        hide: (chatId) => getChatSettings(chatId).continuousChat !== 'summary'
      },
      {
        key: 'summaryTemperature',
        name: 'Summary Temperature',
        title: 'What sampling temperature to use, between 0 and 2, when generating summary. Lower values, like 0, will be more deterministic.',
        min: 0,
        max: 2,
        step: 0.1,
        type: 'number',
        hide: (chatId) => getChatSettings(chatId).continuousChat !== 'summary'
      },
      {
        key: 'pinTop',
        name: 'Keep First Prompts',
        title: 'When we run out of space and need to remove prompts, the top number of prompts will not be removed after summarization/FIFO.',
        min: 0,
        max: 4,
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).continuousChat

      },
      {
        key: 'pinBottom',
        name: 'Keep Bottom Prompts',
        title: 'When we run out of space and need to remove prompts, do not remove or summarize the the last number prompts you set here.',
        min: 0,
        max: 20, // Will be auto adjusted down if needs more
        step: 1,
        type: 'number',
        hide: (chatId) => !getChatSettings(chatId).continuousChat

      },
      {
        key: 'summaryPrompt',
        name: 'Summary Generation Prompt',
        title: 'A prompt used to summarize past prompts.',
        placeholder: 'Enter a prompt that will be used to summarize past prompts here.',
        type: 'textarea',
        hide: (chatId) => getChatSettings(chatId).continuousChat !== 'summary'
      }
// TODO: Image generation is currently not working
//      {
//        key: 'imageGenerationModel',
//        name: 'Image Generation Model',
//        header: 'Image Generation',
//        headerClass: 'is-info',
//        title: 'Prompt an image with: show me an image of ...',
//        type: 'select',
//        options: []
//      }
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
      title: 'The model to use. Some may cost more than others.',
      header: (chatId) => {
        return getModelDetail(getChatSettings(chatId).model).help
      },
      headerClass: 'is-warning',
      options: [],
      type: 'select',
      forceApi: true, // Need to make sure we send this
      afterChange: (chatId, setting) => true, // refresh settings
      footer: (chatId) => {
        const model = getModelDetail(getChatSettings(chatId).model)
        if (model.prompt && model.completion) {
          return `<span class="has-text-grey">$${(model.prompt * 1000000).toFixed(2)} / $${(model.completion * 1000000).toFixed(2)} per 1M In/Out-Tokens</span>`
        }
        return ''
      }
}

const chatSettingsList: ChatSetting[] = [
      profileSetting,
      {
        key: 'profileName',
        name: 'Profile Name',
        title: 'How this profile is displayed in the select list.',
        type: 'text'
      },
      {
        key: 'profileDescription',
        name: 'Profile Description',
        title: 'How this profile is displayed in the select list.',
        type: 'textarea'
      },
      ...systemPromptSettings,
      // ...responseAlterationSettings,
      modelSetting,
      {
        key: 'holdSocket',
        name: 'Continue WebSocket',
        title: 'Hold WebSocket connection open and try to re-use for each new chat message. Faster, but message delimitation could get mangled.',
        type: 'boolean',
        hide: hideModelSetting
      },
      {
        key: 'temperature',
        name: 'Temperature',
        title: 'What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.\n' +
              '\n' +
              'We generally recommend altering this or top_p but not both.',
        min: 0,
        max: 2,
        step: 0.1,
        type: 'number',
        fieldControls: [
          {
            getAction: (chatId, setting, value) => {
              const model = getChatSettings(chatId).model
              if (model.startsWith('o')) {
                // Set value to 1 if not already
                if (value !== 1) {
                  // Import setChatSettingValueByKey at the top if not already
                  setChatSettingValueByKey(chatId, 'temperature', 1)
                }
                return {
                  title: 'o-Models do not support changing this',
                  disabled: true
                }
              }
              return { title: '', disabled: false }
            }
          }
        ]
      },
      {
        key: 'top_p',
        name: 'Top-p',
        title: 'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.\n' +
              '\n' +
              'We generally recommend altering this or temperature but not both',
        min: 0,
        max: 1,
        step: 0.1,
        type: 'number',
        fieldControls: [
          {
            getAction: (chatId, setting, value) => {
              const model = getChatSettings(chatId).model
              if (model.startsWith('o')) {
                // Set value to 1 if not already
                if (value !== 1) {
                  // Import setChatSettingValueByKey at the top if not already
                  setChatSettingValueByKey(chatId, 'top_p', 1)
                }
                return {
                  title: 'o-Models do not support changing this',
                  disabled: true
                }
              }
              return { title: '', disabled: false }
            }
          }
        ],
        hidden: true
      },
      {
        key: 'max_completion_tokens',
        name: 'Max Response Tokens',
        title: 'The maximum number of tokens to generate in the model response.\n' +
              'The upper limit depends on the model (GPT-4o: 16384, GPT-4.1: 32768).\n',
        min: 1,
        max: 32768,
        step: 1,
        type: 'number',
        forceApi: true, // Need to make sure we send this
        hidden: true
      },
      {
        key: 'presence_penalty',
        name: 'Presence Penalty',
        title: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model\'s likelihood to talk about new topics.',
        min: -2,
        max: 2,
        step: 0.2,
        type: 'number',
        hide: hideModelSetting,
        hidden: true
      },
      {
        key: 'frequency_penalty',
        name: 'Frequency Penalty',
        title: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model\'s likelihood to repeat the same line verbatim.',
        min: -2,
        max: 2,
        step: 0.2,
        type: 'number',
        hide: hideModelSetting,
        hidden: true
      },
      {
        key: 'repetitionPenalty',
        name: 'Repetition Penalty',
        title: 'Number between 1.0 and infinity. Penalize new tokens based on whether they appear in the text so far, increasing the model\'s likelihood to talk about new topics.',
        min: 0,
        max: 1000,
        step: 0.1,
        type: 'number',
        hide: hideModelSetting
      },
      {
        key: 'startSequence',
        name: 'Start Sequence',
        title: 'Characters used to start the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).start
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'stopSequence',
        name: 'Stop Sequences',
        title: 'Characters used to signal end of message chain. Separate multiple with a comma.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).stop
          return (val && val.join(',')) || ''
        },
        hide: hideModelSetting,
        apiTransform: (chatId, setting, value) => {
          const model = getChatSettings(chatId).model
          // Stop sequences are not supported with o-models
          if (model.startsWith('o')) {
            return null
          }
          // Original logic might parse comma-separated string? Assume value is already array or null.
          // Need to ensure it's passed correctly if not null. The default reduce logic handles this.
          return value
        }
      },
      {
        key: 'aggressiveStop',
        name: 'Use aggressive stop',
        title: 'Sometimes generation can continue even after a stop sequence. This will stop generation client side if generation continues after stop sequence.',
        type: 'boolean',
        hide: hideModelSetting
      },
      {
        key: 'delimiter',
        name: 'Delimiter Sequence',
        title: 'Characters used to separate messages in the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).delimiter
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'userMessageStart',
        name: 'User Message Start Sequence',
        title: 'Sequence to denote start of user messages in the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).userStart
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'userMessageEnd',
        name: 'User Message End Sequence',
        title: 'Sequence to denote end of user messages in the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).userEnd
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'assistantMessageStart',
        name: 'Assistant Message Start Sequence',
        title: 'Sequence to denote assistant messages in the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).assistantStart
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'assistantMessageEnd',
        name: 'Assistant Message End Sequence',
        title: 'Sequence to denote end of assistant messages in the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).assistantEnd
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'systemMessageStart',
        name: 'System Message Start Sequence',
        title: 'Sequence to denote system messages in the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).systemStart
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'systemMessageEnd',
        name: 'System Message End Sequence',
        title: 'Sequence to denote end of system messages in the message chain.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).systemEnd
          return val || ''
        },
        hide: hideModelSetting
      },
      {
        key: 'leadPrompt',
        name: 'Completion Lead Sequence',
        title: 'Sequence to hint to answer as assistant.',
        type: 'textarea',
        placeholder: (chatId) => {
          const val = getModelDetail(getChatSettings(chatId).model).leadPrompt
          return val || ''
        },
        hide: hideModelSetting,
        hidden: true
      },
      {
        key: 'logit_bias',
        name: 'Logit Bias',
        title: 'Allows you to adjust bias of tokens used in completion.',
        header: 'Logit Bias. See <a target="_blank" href="https://help.openai.com/en/articles/5247780-using-logit-bias-to-define-token-probability">this article</a> for more details.',
        type: 'other',
        hide: () => true,
        apiTransform: (chatId, setting, val:Record<string, number>) => {
          if (!val) return null
          const tokenized:Record<number, number> = Object.entries(val).reduce((a, [k, v]) => {
            const tokens:number[] = getTokens(getChatSettings(chatId).model, k)
            tokens.forEach(t => { a[t] = v })
            return a
          }, {} as Record<number, number>)
          return tokenized
        }
      },
      {
        key: 'stream',
        name: 'Stream Response',
        title: 'Stream responses as they are generated.',
        type: 'boolean',
        hide: hideModelSetting,
        hidden: true
      },
      {
        key: 'n',
        name: 'Number of Responses',
        title: 'CAREFUL WITH THIS ONE: How many chat completion choices to generate for each input message. This can eat tokens.',
        min: 1,
        max: 10,
        step: 1,
        type: 'number',
        hide: hideModelSetting,
        hidden: true
      },
      {
        key: 'store',
        name: 'Store Messages and Responses externally in OpenAI dashboard',
        title: 'Whether or not to archive the messages and responses on the OpenAI servers.',
        type: 'boolean',
        hidden: true
      },
      {
        key: 'service_tier',
        name: 'Service Tier (Flex=1/2 price)',
        title: 'Specifies the latency tier to use for processing the request. "Flex" is half price.',
        type: 'select',
        options: [
          { value: 'auto', text: 'Auto' },
          { value: 'default', text: 'Default' },
          { value: 'flex', text: 'Flex' }
        ],
        hide: (chatId) => {
          const model = getChatSettings(chatId).model
          return !(model.startsWith('o'))
        },
        apiTransform: (chatId, setting, value) => {
          const model = getChatSettings(chatId).model
          if (model.startsWith('o')) {
            // If user explicitly selected auto or default, use that.
            // Otherwise (value is 'flex' or null/default 'auto'), use 'flex'.
            return (value === 'auto' || value === 'default') ? value : 'flex'
          }
          return null // Don't send for other models
        }
      },
      {
        key: 'reasoning_effort',
        name: 'Reasoning Effort',
        title: 'Constrains effort on reasoning for o-series models. Reducing effort can result in faster responses and fewer reasoning tokens.',
        type: 'select',
        options: [
          { value: 'low', text: 'Low' },
          { value: 'medium', text: 'Medium' },
          { value: 'high', text: 'High' }
        ],
        hide: (chatId) => {
          const model = getChatSettings(chatId).model
          return !(model.startsWith('o'))
        },
        apiTransform: (chatId, setting, value) => {
          const model = getChatSettings(chatId).model
          // Only send if o-model and value is not the default 'medium'
          // Or always send if model matches? API default is medium. Let's always send if model matches.
          return (model.startsWith('o')) ? value : null
        }
      },
      {
        key: 'user',
        name: 'User?',
        title: 'Name of user?',
        type: 'text',
        hide: () => true
      },
      ...summarySettings
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
      },
      {
        key: 'openAICompletionEndpoint',
        name: 'OpenAI Completions Endpoint',
        type: 'text'
      },
      {
        key: 'enablePetals',
        name: 'Enable Petals APIs',
        type: 'boolean'
      },
      {
        key: 'pedalsEndpoint',
        name: 'Petals API Endpoint',
        type: 'text'
      },
      {
        key: 'openAiEndpoint',
        name: 'OpenAI API Endpoint',
        type: 'text'
      }
]

const globalSettingLookup:Record<string, GlobalSetting> = globalSettingsList.reduce((a, v) => {
      if (a[v.key]) console.error(`${a[v.key]} is defined more than once in Global Settings.`)
      a[v.key] = v
      return a
}, {} as Record<string, GlobalSetting>)

</script>