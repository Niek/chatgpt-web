<script context="module" lang="ts">
import type { Message, Response } from './Types.svelte'

export class ChatCompletionResponse {
  private message: Message
  private finishPromise: Promise<Message>
  private finishResolver: (value: Message) => void
  private finished: boolean = false
  private messageChangeListeners: ((m: Message) => void)[] = []

  public constructor () {
    this.message = {
      role: 'assistant',
      content: '',
      usage: undefined,
      model: undefined
    }

    this.finishPromise = new Promise<Message>((resolve, reject) => {
      this.finishResolver = resolve
    })
  }

  public updateFromSyncResponse (responseData: Response) {
    this.message.usage = responseData.usage
    this.message.model = responseData.model
    const choiceMessage = responseData.choices[0].message
    this.message.role = choiceMessage.role
    this.message.content = choiceMessage.content.trim()
    this.messageChange()
    this.finish()
  }

  public updateFromAsyncResponse (responseData: Response) {
    this.message.model = responseData.model
    const choice = responseData.choices[0]

    // Role typically provided on first chunk of data
    if (choice.delta?.role) {
      this.message.role = choice.delta.role
    }

    // Content not provided in some chunks of data
    if (choice.delta?.content) {
      this.message.content += choice.delta.content
    }

    this.messageChange()
    if (choice.finish_reason !== null) {
      this.finish()
    }
  }

  public updateFromError (errorMessage: string) {
    this.message.role = 'error'
    this.message.content = `Error: ${errorMessage}`
    this.messageChange()
    this.finish()
  }

  public onMessageChange (listener: (m: Message) => void) {
    this.messageChangeListeners.push(listener)
  }

  public promiseToFinish () {
    return this.finishPromise
  }

  public hasFinished () {
    return this.finished
  }

  private messageChange () {
    for (const listener of this.messageChangeListeners) {
      listener(this.copyMessage())
    }
  }

  private copyMessage () {
    return JSON.parse(JSON.stringify(this.message)) as Message
  }

  private finish () {
    this.finished = true
    this.finishResolver(this.copyMessage())
  }
}

</script>