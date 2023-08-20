<script context="module" lang="ts">
    import { getPetalsBase, getPetalsWebsocket } from '../../ApiUtil.svelte'
    import { countTokens, getDelimiter, getLeadPrompt, getRoleEnd, getRoleTag, getStartSequence } from '../../Models.svelte'
    import { countMessageTokens } from '../../Stats.svelte'
    import { globalStorage } from '../../Storage.svelte'
    import type { Chat, Message, Model, ModelDetail } from '../../Types.svelte'
    import { chatRequest } from './request.svelte'
    import { checkModel } from './util.svelte'
    import llamaTokenizer from 'llama-tokenizer-js'
    import { get } from 'svelte/store'

const hideSettings = {
  stream: true,
  n: true,
  presence_penalty: true,
  frequency_penalty: true
}

const chatModelBase = {
  type: 'instruct', // Used for chat, but these models operate like instruct models -- you have to manually structure the messages sent to them
  help: 'Below are the settings that can be changed for the API calls. See <a target="_blank" href="https://platform.openai.com/docs/api-reference/chat/create">this overview</a> to start, though not all settings translate to Petals.',
  check: checkModel,
  start: '<s>',
  stop: ['###', '</s>'],
  delimiter: '\n###\n\n',
  userStart: 'User:\n',
  userEnd: '',
  assistantStart: '[[CHARACTER_NAME]]:\n',
  assistantEnd: '',
  leadPrompt: '[[CHARACTER_NAME]]:\n',
  systemEnd: '',
  prompt: 0.000000, // $0.000 per 1000 tokens prompt
  completion: 0.000000, // $0.000 per 1000 tokens completion
  max: 4096, // 4k max token buffer
  request: chatRequest,
  getEndpoint: (model) => get(globalStorage).pedalsEndpoint || (getPetalsBase() + getPetalsWebsocket()),
  getTokens: (value) => llamaTokenizer.encode(value),
  hideSetting: (chatId, setting) => !!hideSettings[setting.key],
  countMessageTokens: (message:Message, model:Model, chat: Chat):number => {
        const delim = getDelimiter(chat)
        return countTokens(model, getRoleTag(message.role, model, chat) + ': ' +
        message.content + getRoleEnd(message.role, model, chat) + (delim || '###'))
  },
  countPromptTokens: (prompts:Message[], model:Model, chat: Chat):number => {
        return prompts.reduce((a, m) => {
          a += countMessageTokens(m, model, chat)
          return a
        }, 0) + countTokens(model, getStartSequence(chat)) + countTokens(model, getLeadPrompt(chat))
  }
} as ModelDetail

export const chatModels : Record<string, ModelDetail> = {
      // 'enoch/llama-65b-hf': {
      //   ...chatModelBase,
      //   label: 'Petals - Llama-65b'
      // },
      'timdettmers/guanaco-65b': {
        ...chatModelBase,
        label: 'Petals - Guanaco-65b',
        max: 2048
      },
      // 'meta-llama/Llama-2-70b-hf': {
      //   ...chatModelBase,
      //   label: 'Petals - Llama-2-70b'
      // },
      'meta-llama/Llama-2-70b-chat-hf': {
        ...chatModelBase,
        label: 'Petals - Llama-2-70b-chat',
        start: '<s>',
        stop: ['</s>', '[INST]', '[/INST]', '<<SYS>>', '<</SYS>>'],
        delimiter: ' </s><s>',
        userStart: '[INST][[SYSTEM_PROMPT]]',
        userEnd: ' [/INST]',
        assistantStart: '[[SYSTEM_PROMPT]][[USER_PROMPT]]',
        systemStart: '<<SYS>>\n',
        systemEnd: '\n<</SYS>>\n\n'
        // leadPrompt: ''
      },
      'stabilityai/StableBeluga2': {
        ...chatModelBase,
        label: 'Petals - StableBeluga-2'
      }
}

</script>