# ChatGPT-web

## **URL**: https://niek.github.io/chatgpt-web/

![Screenshot of ChatGPT-web](.github/screenshot.png)

ChatGPT-web is a simple one-page web interface to the OpenAI ChatGPT API. To use it, you need to register for [an OpenAI API key](https://platform.openai.com/account/api-keys) first. All messages are stored in your browser's local storage, so everything is **private**. You can also close the browser tab and come back later to continue the conversation.

## Why?

Why not use the [official ChatGPT interface](https://chat.openai.com/)? Becauce ChatGPT-web will allow more customization, and since it uses the commercial OpenAI API it should be more reliable. It's also *much* cheaper than ChatGPT Pro - at $20 per month, you would need to use *10 million* tokens on the OpenAI API for this to break even. Finally, since ChatGPT-web is open source, so you can host it yourself and make changes as you want.

## Development

To run the development server, run

```bash
npm ci
npm run dev # or: npm run build
```