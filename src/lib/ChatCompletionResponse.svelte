<script context="module" lang="ts">
import { setImage } from './ImageStore.svelte'
import { countTokens, getModelDetail } from './Models.svelte'
// TODO: Integrate API calls
import { addMessage, getLatestKnownModel, setLatestKnownModel, subtractRunningTotal, updateMessages, updateRunningTotal } from './Storage.svelte'
import type { Chat, ChatCompletionOpts, ChatImage, Message, Model, Response, Usage } from './Types.svelte'
import { v4 as uuidv4 } from 'uuid'

export class ChatCompletionResponse {
  constructor (opts: ChatCompletionOpts) {
    this.opts = opts
    this.chat = opts.chat
    this.messages = []
    if (opts.fillMessage) {
      this.messages.push(opts.fillMessage)
      this.offsetTotals = opts.fillMessage.usage && JSON.parse(JSON.stringify(opts.fillMessage.usage))
      this.isFill = true
    }
    if (opts.onMessageChange) this.messageChangeListeners.push(opts.onMessageChange)
  }

  private offsetTotals: Usage
  private isFill: boolean = false
  private didFill: boolean = false

  private opts: ChatCompletionOpts
  private chat: Chat

  private messages: Message[]

  private error: string

  private model: Model
  private lastModel: Model

  private setModel = (model: Model) => {
    if (!model) return
    !this.model && setLatestKnownModel(this.chat.settings.model, model)
    this.lastModel = this.model || model
    this.model = model
  }

  private finishResolver: (value: Message[]) => void
  private errorResolver: (error: string) => void
  private finishPromise = new Promise<Message[]>((resolve, reject) => {
    this.finishResolver = resolve
    this.errorResolver = reject
  })

  private promptTokenCount:number
  private finished = false
  private messageChangeListeners: ((m: Message[]) => void)[] = []
  private finishListeners: ((m: Message[]) => void)[] = []

  private initialFillMerge (existingContent:string, newContent:string):string {
    const modelDetail = getModelDetail(this.model)
    if (!this.didFill && this.isFill && modelDetail.preFillMerge) {
      existingContent = modelDetail.preFillMerge(existingContent, newContent)
    }
    this.didFill = true
    return existingContent
  }

  setPromptTokenCount (tokens:number) {
    this.promptTokenCount = tokens
  }

  getPromptTokenCount (): number {
    return this.promptTokenCount
  }

  async updateImageFromSyncResponse (images: string[], prompt: string, model: Model) {
    this.setModel(model)
    for (let i = 0; i < images.length; i++) {
      const b64image = images[i]
      const message = {
        role: 'image',
        uuid: uuidv4(),
        content: prompt,
        image: await setImage(this.chat.id, { b64image } as ChatImage),
        model,
        usage: {
          prompt_tokens: 0,
          completion_tokens: 1,
          total_tokens: 1
        } as Usage
      } as Message
      this.messages[i] = message
      if (this.opts.autoAddMessages) addMessage(this.chat.id, message)
    }
    this.notifyMessageChange()
    this.finish()
  }

  updateFromSyncResponse (response: Response) {
    this.setModel(response.model)
    if (!response.choices) {
      return this.updateFromError(response?.error?.message || 'unexpected response from API')
    }
    response.choices?.forEach((choice, i) => {
      const exitingMessage = this.messages[i]
      const message = exitingMessage || choice.message
      if (exitingMessage) {
        message.content = this.initialFillMerge(message.content, choice.message.content)
        message.content += choice.message.content
        message.usage = message.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        } as Usage
        message.usage.completion_tokens += response?.usage?.completion_tokens || 0
        message.usage.prompt_tokens = (response?.usage?.prompt_tokens || 0) + (this.offsetTotals?.prompt_tokens || 0)
        message.usage.total_tokens = (response?.usage?.total_tokens || 0) + (this.offsetTotals?.total_tokens || 0)
      } else {
        message.content = choice.message.content
        message.usage = response.usage
      }
      message.finish_reason = choice.finish_reason
      message.role = choice.message.role
      message.model = response.model
      this.messages[i] = message
      if (this.opts.autoAddMessages) addMessage(this.chat.id, message)
    })
    this.notifyMessageChange()
    this.finish()
  }

  updateFromAsyncResponse (response: Response) {
    let completionTokenCount = 0
    this.setModel(response.model)
    if (!response.choices || response?.error) {
      return this.updateFromError(response?.error?.message || 'unexpected streaming response from API')
    }
    response.choices?.forEach((choice, i) => {
      const message = this.messages[i] || {
        role: 'assistant',
        content: '',
        uuid: uuidv4()
      } as Message
      choice.delta?.role && (message.role = choice.delta.role)
      if (choice.delta?.content) {
        message.content = this.initialFillMerge(message.content, choice.delta?.content)
        message.content += choice.delta.content
      }
      completionTokenCount += countTokens(this.model, message.content)
      message.model = response.model
      message.finish_reason = choice.finish_reason
      message.streaming = !choice.finish_reason && !this.finished
      this.messages[i] = message
    })
    // total up the tokens
    const promptTokens = this.promptTokenCount + (this.offsetTotals?.prompt_tokens || 0)
    const totalTokens = promptTokens + completionTokenCount
    this.messages.forEach(m => {
      m.usage = {
        completion_tokens: completionTokenCount,
        total_tokens: totalTokens,
        prompt_tokens: promptTokens
      } as Usage
      if (this.opts.autoAddMessages) addMessage(this.chat.id, m)
    })
    const finished = !this.messages.find(m => m.streaming)
    this.notifyMessageChange()
    if (finished) this.finish()
  }

  updateFromError (errorMessage: string): void {
    if (this.finished || this.error) return
    this.error = errorMessage
    if (this.opts.autoAddMessages) {
      addMessage(this.chat.id, {
        role: 'error',
        content: `Error: ${errorMessage}`,
        uuid: uuidv4()
      } as Message)
    }
    this.notifyMessageChange()
    setTimeout(() => this.finish('abort'), 200) // give others a chance to signal the finish first
  }

  updateFromClose (force: boolean = false): void {
    if (!this.finished && !this.error && !this.messages?.find(m => m.content)) {
      if (!force) return setTimeout(() => this.updateFromClose(true), 300) as any
      if (!this.finished) return this.updateFromError('Unexpected connection termination')
    }
    setTimeout(() => this.finish(), 260) // give others a chance to signal the finish first
  }

  onMessageChange = (listener: (m: Message[]) => void): number =>
    this.messageChangeListeners.push(listener)

  onFinish = (listener: (m: Message[]) => void): number =>
    this.finishListeners.push(listener)

  promiseToFinish = (): Promise<Message[]> => this.finishPromise

  hasFinished = (): boolean => this.finished

  getError = (): string => this.error
  hasError = (): boolean => !!this.error
  getMessages = (): Message[] => this.messages

  private notifyMessageChange (): void {
    this.messageChangeListeners.forEach((listener) => {
      listener(this.messages)
    })
  }

  private notifyFinish (): void {
    this.finishListeners.forEach((listener) => {
      listener(this.messages)
    })
  }

  finish = (reason: string = ''): void => {
    if (this.finished) return
    this.messages.forEach(m => {
      m.streaming = false
      if (reason) m.finish_reason = reason
    }) // make sure all are marked stopped
    updateMessages(this.chat.id)
    this.finished = true
    const message = this.messages[0]
    const model = this.model || getLatestKnownModel(this.chat.settings.model)
    if (message) {
      if (this.isFill && this.lastModel === this.model && this.offsetTotals && model && message.usage) {
        // Need to subtract some previous message totals before we add new combined message totals
        subtractRunningTotal(this.chat.id, this.offsetTotals, model)
      }
      updateRunningTotal(this.chat.id, message.usage as Usage, model)
    } else if (this.model) {
      // If no messages it's probably because of an error or user initiated abort.
      // this.model is set when we received a valid response. If we've made it that
      //  far, we'll assume we've been charged for the prompts sent.
      // This could under-count in some cases.
      const usage:Usage = {
        prompt_tokens: this.promptTokenCount,
        completion_tokens: 0, // We have no idea if there are any to count
        total_tokens: this.promptTokenCount
      }
      updateRunningTotal(this.chat.id, usage as Usage, model)
    }
    this.notifyFinish()
    if (this.error) {
      this.errorResolver(this.error)
    } else {
      this.finishResolver(this.messages)
    }
  }
}
</script>