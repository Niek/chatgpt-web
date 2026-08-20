<script context="module" lang="ts">
  import { getProvider, type ProviderId } from './providers/openai/providers'

  // Environment overrides remain useful for custom OpenAI-compatible APIs.
  export const getEndpointCompletions = (providerId: ProviderId):string =>
    import.meta.env.VITE_ENDPOINT_COMPLETIONS || getProvider(providerId).endpoints.completions
  export const getImageEndpoint = (providerId: ProviderId):string | undefined =>
    import.meta.env.VITE_ENDPOINT_GENERATIONS || getProvider(providerId).image?.endpoint
  export const getEndpointModels = (providerId: ProviderId):string =>
    import.meta.env.VITE_ENDPOINT_MODELS || getProvider(providerId).endpoints.models
  export const getEndpointEmbeddings = (providerId: ProviderId):string =>
    import.meta.env.VITE_ENDPOINT_EMBEDDINGS || getProvider(providerId).endpoints.embeddings
</script>
