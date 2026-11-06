/** Provedores e modelos sugeridos (compartilhado entre client e servidor). */

export type AIProvider = 'groq' | 'openai'
export type AIUsage = 'chat' | 'analise'

export interface ProviderInfo {
    id: AIProvider
    label: string
    keyPrefix: string
    keysUrl: string
    models: Array<{ id: string; label: string }>
}

export const AI_PROVIDERS: ProviderInfo[] = [
    {
        id: 'groq',
        label: 'Groq',
        keyPrefix: 'gsk_',
        keysUrl: 'https://console.groq.com/keys',
        models: [
            { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (rápido)' },
            { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
            { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
        ],
    },
    {
        id: 'openai',
        label: 'OpenAI',
        keyPrefix: 'sk-',
        keysUrl: 'https://platform.openai.com/api-keys',
        models: [
            { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
            { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
        ],
    },
]

export const DEFAULT_PROVIDER: AIProvider = 'groq'
export const DEFAULT_MODEL = 'openai/gpt-oss-20b'

export const providerLabel = (id: string) => AI_PROVIDERS.find(p => p.id === id)?.label ?? id

export const AI_USAGE_LABEL: Record<AIUsage, string> = {
    chat: 'Chat (Amigão e WhatsApp)',
    analise: 'Análise de relatórios',
}
