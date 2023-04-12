<script context="module" lang="ts">
import type { Message, Response } from './Types.svelte'

export class ChatCompletionResponse {
  private message: Message = {
    role: 'assistant',
    content: ''
  }

  private finishResolver: (value: Message) => void
  private finishPromise = new Promise<Message>((resolve) => {
    this.finishResolver = resolve
  })

  private finished = false
  private messageChangeListeners: ((m: Message) => void)[] = []

  updateFromSyncResponse (responseData: Response) {
    this.message.usage = responseData.usage
    this.message.model = responseData.model
    const choiceMessage = responseData.choices[0].message
    this.message.role = choiceMessage.role
    this.message.content = choiceMessage.content.trim()
    this.notifyMessageChange()
    this.finish()
  }

  updateFromAsyncResponse (responseData: Response) {
    this.message.model = responseData.model
    const choice = responseData.choices[0]
    choice.delta?.role && (this.message.role = choice.delta.role)
    choice.delta?.content && (this.message.content += choice.delta.content)
    this.notifyMessageChange()
    if (choice.finish_reason !== null) this.finish()
  }

  updateFromError (errorMessage: string): void {
    this.message.role = 'error'
    this.message.content = `Error: ${errorMessage}`
    this.notifyMessageChange()
    this.finish()
  }

  onMessageChange = (listener: (m: Message) => void): number =>
    this.messageChangeListeners.push(listener)

  promiseToFinish = (): Promise<Message> => this.finishPromise

  hasFinished = (): boolean => this.finished

  private notifyMessageChange (): void {
    this.messageChangeListeners.forEach((listener) => {
      listener(this.getMessageCopy())
    })
  }

  private getMessageCopy = (): Message => JSON.parse(JSON.stringify(this.message)) as Message

  private finish = (): void => {
    this.finished = true
    this.finishResolver(this.getMessageCopy())
  }
}
</script>