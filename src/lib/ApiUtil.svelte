<script context="module" lang="ts">
  const apiBase = process.env.VITE_API_BASE || 'https://api.openai.com'
  const endpointCompletions = process.env.VITE_ENDPOINT_COMPLETIONS || '/v1/chat/completions'
  const endpointModels = process.env.VITE_ENDPOINT_MODELS || '/v1/models'
  
  export const getApiBase = ():string => apiBase
  export const getEndpointCompletions = ():string => endpointCompletions
  export const getEndpointModels = ():string => endpointModels
</script>
