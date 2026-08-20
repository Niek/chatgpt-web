export type ProviderId = 'openai' | 'anthropic' | 'xai' | 'gemini' | 'orcarouter' | 'custom'

export type Provider = {
  id: ProviderId
  name: string
  apiBase: string
  endpoints: {
    completions: string
    generations: string
    models: string
    embeddings: string
  }
  documentationUrl: string
  apiKeyUrl?: string
  compatibilityNotice?: string
  supportsImageGeneration: boolean
  headers?: Record<string, string>
}

const openAiEndpoints = {
  completions: '/v1/chat/completions',
  generations: '/v1/images/generations',
  models: '/v1/models',
  embeddings: '/v1/embeddings'
}

export const providers: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    apiBase: 'https://api.openai.com',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://platform.openai.com/docs/api-reference',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    supportsImageGeneration: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiBase: 'https://api.anthropic.com',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    compatibilityNotice: 'Anthropic supports the OpenAI SDK primarily for testing and comparison. Some OpenAI fields are ignored or translated.',
    supportsImageGeneration: false,
    headers: {
      'anthropic-dangerous-direct-browser-access': 'true'
    }
  },
  {
    id: 'xai',
    name: 'xAI',
    apiBase: 'https://api.x.ai',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://docs.x.ai/docs/api-reference',
    apiKeyUrl: 'https://console.x.ai/',
    supportsImageGeneration: false
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    endpoints: {
      completions: '/chat/completions',
      generations: '/images/generations',
      models: '/models',
      embeddings: '/embeddings'
    },
    documentationUrl: 'https://ai.google.dev/gemini-api/docs/openai',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    supportsImageGeneration: false
  },
  {
    id: 'orcarouter',
    name: 'OrcaRouter',
    apiBase: 'https://api.orcarouter.ai',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://docs.orcarouter.ai/',
    supportsImageGeneration: false
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-compatible',
    apiBase: '',
    endpoints: openAiEndpoints,
    documentationUrl: 'https://platform.openai.com/docs/api-reference',
    supportsImageGeneration: true
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

export const normalizeApiBase = (apiBase: string): string => {
  return apiBase.trim().replace(/\/+$/, '')
}

export const inferProviderId = (apiBase: string): ProviderId => {
  const normalized = normalizeApiBase(apiBase).toLowerCase()
  if (normalized.includes('api.anthropic.com')) return 'anthropic'
  if (normalized.includes('api.x.ai')) return 'xai'
  if (normalized.includes('generativelanguage.googleapis.com')) return 'gemini'
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
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...provider.headers
  }
}
