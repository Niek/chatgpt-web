<script context="module" lang="ts">
// TODO: Integrate API calls
import { addMessage, saveChatStore, updateRunningTotal } from './Storage.svelte'
import type { Chat, ChatCompletionOpts, Message, Response, Usage } from './Types.svelte'
import { encode } from 'gpt-tokenizer'
import { v4 as uuidv4 } from 'uuid'

export class ChatCompletionResponse {
  constructor (opts: ChatCompletionOpts) {
    this.opts = opts
    this.chat = opts.chat
    this.messages = []
    if (opts.fillMessage) this.messages.push(opts.fillMessage)
    if (opts.onMessageChange) this.messageChangeListeners.push(opts.onMessageChange)
  }

  private opts: ChatCompletionOpts
  private chat: Chat

  private messages: Message[]

  private error: string

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

  setPromptTokenCount (tokens:number) {
    this.promptTokenCount = tokens
  }

  updateFromSyncResponse (response: Response) {
    response.choices.forEach((choice, i) => {
      const message = this.messages[i] || choice.message
      message.content = choice.message.content
      message.usage = response.usage
      message.model = response.model
      message.role = choice.message.role
      this.messages[i] = message
      if (this.opts.autoAddMessages) addMessage(this.chat.id, message)
    })
    this.notifyMessageChange()
    this.finish()
  }

  updateFromAsyncResponse (response: Response) {
    let completionTokenCount = 0
    response.choices.forEach((choice, i) => {
      const message = this.messages[i] || {
        role: 'assistant',
        content: '',
        uuid: uuidv4()
      } as Message
      choice.delta?.role && (message.role = choice.delta.role)
      choice.delta?.content && (message.content += choice.delta.content)
      completionTokenCount += encode(message.content).length
      message.usage = response.usage || {
        prompt_tokens: this.promptTokenCount
      } as Usage
      message.model = response.model
      message.finish_reason = choice.finish_reason
      message.streaming = choice.finish_reason === null
      this.messages[i] = message
      if (this.opts.autoAddMessages) addMessage(this.chat.id, message)
    })
    // total up the tokens
    const totalTokens = this.promptTokenCount + completionTokenCount
    this.messages.forEach(m => {
      if (m.usage) {
        m.usage.completion_tokens = completionTokenCount
        m.usage.total_tokens = totalTokens
      }
    })
    const finished = !this.messages.find(m => m.streaming)
    this.notifyMessageChange()
    if (finished) this.finish()
  }

  updateFromError (errorMessage: string): void {
    if (this.finished) return
    this.error = errorMessage
    if (this.opts.autoAddMessages) {
      addMessage(this.chat.id, {
        role: 'error',
        content: `Error: ${errorMessage}`,
        uuid: uuidv4()
      } as Message)
    }
    this.notifyMessageChange()
    this.finish()
  }

  updateFromClose (): void {
    setTimeout(() => this.finish(), 100) // give others a chance to signal the finish first
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

  private finish = (): void => {
    if (this.finished) return
    this.finished = true
    this.messages.forEach(m => { m.streaming = false }) // make sure all are marked stopped
    saveChatStore()
    const message = this.messages[0]
    if (message) {
      updateRunningTotal(this.chat.id, message.usage as any, message.model as any)
    } else {
      // If no messages it's probably because of an error or user initiated abort.
      // We could miss counting the cost of the prompts sent.
      // To deal with this accurately, we'd need to figure out how far the request
      // made it before ending, and that may not be practical or possible to do reliably.
      // For now, to error on the side of caution, we'll just count the prompts we
      // sent / attempted to send.  This will over-count in many error cases,
      // and may under-count in others.
      const usage:Usage = {
        prompt_tokens: this.promptTokenCount,
        completion_tokens: 0, // We have no idea if there are any to count
        total_tokens: this.promptTokenCount
      }
      updateRunningTotal(this.chat.id, usage as any, this.chat.settings.model as any)
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