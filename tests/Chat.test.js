import { vi, expect, it, describe } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import Chat from '../src/lib/Chat.svelte'
import { addChat } from '../src/lib/Storage.svelte'


describe('Chat', () => {
  it('should call sendRequest with systemText if it is defined', async () => {
    // Mock the fetch POST request
    global.fetch = vi.fn(() =>
      Promise.reject({
        json: () => Promise.resolve({ error: 'imma error' })
      })
    )
    // Render the Chat component with a defined systemText
    const user = userEvent.setup()
    const component = render(Chat, {
      props: {
        params: {
          chatId: addChat({ name: 'test', systemText: 'Hello!' }).toString()
        }
      }
    })

    await user.type(component.container.querySelector('textarea'), 'SystemMsg2')

    await user.type(component.container.querySelector('form textarea'), 'UserMsg2')
    await user.keyboard('{Enter}')

    // Call the submit function and wait for it to resolve
    // Expect that fetch was called with the expected arguments
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'SystemMsg2'
          },
          {
            role: 'user',
            content: 'UserMsg2'
          }
        ],
        model: 'gpt-3.5-turbo',
        stream: true
      }),
      signal: new AbortController().signal
    }))

    component.component.$destroy()
    component.unmount()
  })

  it('should call sendRequest without systemText if it is undefined', async () => {
    // Render the Chat component with an undefined systemText
    const user = userEvent.setup()
    const component = render(Chat, {
      props: {
        params: {
          chatId: addChat({ name: 'test2' })
        }
      }
    })
    // Mock the fetch POST request
    global.fetch = vi.fn(() =>
      Promise.reject({
        json: () => Promise.resolve({ error: 'imma error' })
      })
    )
    // Call the sendRequest function and wait for it to resolve

    await user.type(component.container.querySelector('form textarea'), 'UserMsg1')
    await user.keyboard('{Enter}')

    // Expect that fetch was called with the expected arguments
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'UserMsg1'
          }
        ],
        model: 'gpt-3.5-turbo',
        stream: true
      }),
      signal: new AbortController().signal
    }))
    component.component.$destroy()
    component.unmount()
  })
})
