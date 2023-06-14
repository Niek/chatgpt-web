<script context="module" lang="ts">
  // This makes it possible to override the OpenAI API base URL in the .env file
  const apiBase = import.meta.env.VITE_API_BASE || 'https://api.openai.com'
  const endpointCompletions = import.meta.env.VITE_ENDPOINT_COMPLETIONS || '/v1/chat/completions'
  const endpointGenerations = import.meta.env.VITE_ENDPOINT_GENERATIONS || '/v1/images/generations'
  const endpointModels = import.meta.env.VITE_ENDPOINT_MODELS || '/v1/models'

  export const getApiBase = ():string => apiBase
  export const getEndpointCompletions = ():string => endpointCompletions
  export const getEndpointGenerations = ():string => endpointGenerations
  export const getEndpointModels = ():string => endpointModels
</script>