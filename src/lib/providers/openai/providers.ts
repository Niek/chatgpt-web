export type ProviderId = 'openai' | 'anthropic' | 'xai' | 'gemini' | 'mistral' | 'apipie' | 'openrouter' | 'orcarouter' | 'custom'

export type ImageProvider = {
  endpoint: string
  suggestedModel?: string
  responseFormat?: 'b64_json'
}

export type Provider = {
  id: ProviderId
  name: string
  apiBase: string
  endpoints: {
    completions: string
    models: string
    embeddings: string
  }
  image?: ImageProvider
  documentationUrl: string
  apiKeyUrl?: string
  compatibilityNotice?: string
  headers?: Record<string, string>
  apiKeyHeader?: string
}

const openAiEndpoints = {
  completions: '/v1/chat/completions',
  models: '/v1/models',
  embeddings: '/v1/embeddings'
}

export const providers: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    apiBase: 'https://api.openai.com',
    endpoints: openAiEndpoints,
    image: {
      endpoint: '/v1/images/generations',
      suggestedModel: 'gpt-image-2'
    },
    documentationUrl: 'https://platform.openai.com/docs/api-reference',
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiBase: 'https://api.anthropic.com',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    compatibilityNotice: 'Anthropic supports the OpenAI SDK primarily for testing and comparison. Some OpenAI fields are ignored or translated.',
    apiKeyHeader: 'x-api-key',
    headers: {
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    }
  },
  {
    id: 'xai',
    name: 'xAI',
    apiBase: 'https://api.x.ai',
    endpoints: openAiEndpoints,
    image: {
      endpoint: '/v1/images/generations',
      suggestedModel: 'grok-imagine-image-quality',
      responseFormat: 'b64_json'
    },
    documentationUrl: 'https://docs.x.ai/docs/api-reference',
    apiKeyUrl: 'https://console.x.ai/'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    endpoints: {
      completions: '/chat/completions',
      models: '/models',
      embeddings: '/embeddings'
    },
    image: {
      endpoint: '/images/generations',
      suggestedModel: 'gemini-2.5-flash-image',
      responseFormat: 'b64_json'
    },
    documentationUrl: 'https://ai.google.dev/gemini-api/docs/openai',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    apiBase: 'https://api.mistral.ai/v1',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://docs.mistral.ai/api',
    apiKeyUrl: 'https://console.mistral.ai/api-keys'
  },
  {
    id: 'apipie',
    name: 'APIpie',
    apiBase: 'https://apipie.ai',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://apipie.ai/',
    apiKeyUrl: 'https://apipie.ai/dashboard/profile/api-keys'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiBase: 'https://openrouter.ai/api',
    endpoints: openAiEndpoints,
    image: {
      endpoint: '/v1/images'
    },
    documentationUrl: 'https://openrouter.ai/docs/quickstart',
    apiKeyUrl: 'https://openrouter.ai/settings/keys'
  },
  {
    id: 'orcarouter',
    name: 'OrcaRouter',
    apiBase: 'https://api.orcarouter.ai',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://docs.orcarouter.ai/'
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-compatible',
    apiBase: '',
    endpoints: openAiEndpoints,
    image: {
      endpoint: '/v1/images/generations',
      responseFormat: 'b64_json'
    },
    documentationUrl: 'https://platform.openai.com/docs/api-reference'
  }
]

const providerLookup = providers.reduce((lookup, provider) => {
  lookup[provider.id] = provider
  return lookup
}, {} as Record<ProviderId, Provider>)

export const isProviderId = (value: unknown): value is ProviderId => {
  return typeof value === 'string' && value in providerLookup
}

export const getProvider = (providerId: ProviderId): Provider => {
  return providerLookup[providerId] || providerLookup.openai
}

export const resolveImageModel = (providerId: ProviderId, configuredModel = ''): string => {
  const imageProvider = getProvider(providerId).image
  if (!imageProvider) return ''
  return configuredModel.trim() || imageProvider.suggestedModel || ''
}

export const normalizeApiBase = (apiBase: string): string => {
  return apiBase.trim().replace(/\/+$/, '')
}

export const inferProviderId = (apiBase: string): ProviderId => {
  const normalized = normalizeApiBase(apiBase).toLowerCase()
  if (normalized.includes('api.anthropic.com')) return 'anthropic'
  if (normalized.includes('api.x.ai')) return 'xai'
  if (normalized.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (normalized.includes('api.mistral.ai')) return 'mistral'
  if (normalized.includes('apipie.ai')) return 'apipie'
  if (normalized.includes('openrouter.ai')) return 'openrouter'
  if (normalized.includes('api.orcarouter.ai')) return 'orcarouter'
  if (!normalized || normalized.includes('api.openai.com')) return 'openai'
  return 'custom'
}

export const joinApiUrl = (apiBase: string, endpoint: string): string => {
  const base = normalizeApiBase(apiBase)
  let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  if (base.endsWith('/v1') && path.startsWith('/v1/')) {
    path = path.slice(3)
  }
  return base + path
}

export const getProviderHeaders = (
  providerId: ProviderId,
  apiKey: string,
  json = true
): Record<string, string> => {
  const provider = getProvider(providerId)
  return {
    Authorization: `Bearer ${apiKey}`,
    ...(provider.apiKeyHeader ? { [provider.apiKeyHeader]: apiKey } : {}),
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...provider.headers
  }
}
