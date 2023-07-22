<script context="module" lang="ts">
  // This makes it possible to override the OpenAI API base URL in the .env file
  const apiBase = import.meta.env.VITE_API_BASE || 'https://api.openai.com'
  const endpointCompletions = import.meta.env.VITE_ENDPOINT_COMPLETIONS || '/v1/chat/completions'
  const endpointGenerations = import.meta.env.VITE_ENDPOINT_GENERATIONS || '/v1/images/generations'
  const endpointModels = import.meta.env.VITE_ENDPOINT_MODELS || '/v1/models'
  const endpointEmbeddings = import.meta.env.VITE_ENDPOINT_EMBEDDINGS || '/v1/embeddings'
  const endpointPetalsV2Websocket = import.meta.env.VITE_PEDALS_WEBSOCKET || 'wss://chat.petals.dev/api/v2/generate'

  export const getApiBase = ():string => apiBase
  export const getEndpointCompletions = ():string => endpointCompletions
  export const getEndpointGenerations = ():string => endpointGenerations
  export const getEndpointModels = ():string => endpointModels
  export const getEndpointEmbeddings = ():string => endpointEmbeddings
  export const getPetalsV2Websocket = ():string => endpointPetalsV2Websocket
</script>