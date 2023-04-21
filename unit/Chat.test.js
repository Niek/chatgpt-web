import { vi, expect, it, describe } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import Chat from '../src/lib/Chat.svelte'
import { addChat } from '../src/lib/Storage.svelte'


// Mock the fetch POST request
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ "error": "imma error" }),
  })
)

describe('Chat', () => {
  it('should call sendRequest with systemText if it is defined', async () => {
    // Render the Chat component with a defined systemText
    const component = render(Chat, {
      props: {
        params: {
          chatId: addChat({ name: "test", messages: [], systemText: 'Hello!' }).toString()
        }
      },
    })

    component.container.querySelector("textarea").textContent = "SystemMsg"
    component.container.querySelector("form textarea").textContent = "UserMsg"
    await fireEvent.submit(component.container.querySelector("form textarea"))

    // Call the submit function and wait for it to resolve
    // Expect that fetch was called with the expected arguments
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions',{
      method: 'POST',
      headers: {
        Authorization: `Bearer `,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'SystemMsg',
          },
          {
            role: 'user',
            content: 'UserMsg',
          },
        ], "model": "gpt-3.5-turbo",
      }),
    })
    component.component.$destroy()
    component.unmount()
  })

  it('should call sendRequest without systemText if it is undefined', async () => {
    // Render the Chat component with an undefined systemText
    const component = render(Chat, {
      props: {
        params: {
          chatId: addChat({ name: "test2", messages: [] })
        }
      },
    })

    // Call the sendRequest function and wait for it to resolve
    component.container.querySelector("form textarea").textContent = "UserMsg"
    await fireEvent.submit(component.container.querySelector("form textarea"))

    // Expect that fetch was called with the expected arguments
    expect(fetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions',{
      method: 'POST',
      headers: {
        Authorization: `Bearer `,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'UserMsg',
          },
        ], "model": "gpt-3.5-turbo",
      }),
    })
  })
})