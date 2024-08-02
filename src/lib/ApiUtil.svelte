<script context="module" lang="ts">
  // This makes it possible to override the OpenAI API base URL in the .env file
  const endpointCompletions = import.meta.env.VITE_ENDPOINT_COMPLETIONS || '/v1/chat/completions'
  const endpointGenerations = import.meta.env.VITE_ENDPOINT_GENERATIONS || '/v1/images/generations'
  const endpointModels = import.meta.env.VITE_ENDPOINT_MODELS || '/v1/models'
  const endpointEmbeddings = import.meta.env.VITE_ENDPOINT_EMBEDDINGS || '/v1/embeddings'
  const petalsBase = import.meta.env.VITE_PEDALS_WEBSOCKET || 'wss://chat.petals.dev'
  const endpointPetals = import.meta.env.VITE_PEDALS_WEBSOCKET || '/api/v2/generate'

  export const getEndpointCompletions = ():string => endpointCompletions
  export const getEndpointGenerations = ():string => endpointGenerations
  export const getEndpointModels = ():string => endpointModels
  export const getEndpointEmbeddings = ():string => endpointEmbeddings
  export const getPetalsBase = ():string => petalsBase
  export const getPetalsWebsocket = ():string => endpointPetals
</script>