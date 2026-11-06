import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { createAdminClient, ServerConfigError } from '@/lib/supabase/admin'
import type { AIProvider, AIUsage } from '../services/providers'

/** Erro de configuração: o usuário ainda não cadastrou um modelo para o uso. */
export class AIModelNotConfiguredError extends Error {
    constructor(usage?: AIUsage) {
        super(
            usage === 'analise'
                ? 'Nenhum modelo de IA configurado para a análise. Cadastre um em Configurações → IA.'
                : 'Nenhum modelo de IA configurado para o chat. Cadastre um em Configurações → IA.'
        )
        this.name = 'AIModelNotConfiguredError'
    }
}

export interface ResolvedModel {
    model: LanguageModel
    provider: AIProvider
    modelId: string
    /** Opções do provedor (ex.: esforço de raciocínio dos modelos gpt-oss na Groq) */
    providerOptions?: { groq: { reasoningEffort: 'low' | 'medium' | 'high' } }
}

function build(provider: AIProvider, modelId: string, apiKey: string): ResolvedModel {
    if (provider === 'groq') {
        const groq = createGroq({ apiKey })
        return {
            model: groq(modelId),
            provider,
            modelId,
            providerOptions: modelId.startsWith('openai/gpt-oss') ? { groq: { reasoningEffort: 'low' } } : undefined,
        }
    }
    const openai = createOpenAI({ apiKey })
    return { model: openai(modelId), provider, modelId }
}

interface ModelRow { id: string; provedor: AIProvider; modelo: string; api_key: string }

/**
 * Resolve o modelo do usuário para um uso (chat/análise) ou por id (teste de conexão).
 * A chave vem do Vault via RPC restrita ao service_role; nunca sai do servidor.
 * Sem modelo cadastrado, usa GROQ_API_KEY / OPENAI_API_KEY do ambiente, se houver.
 */
export async function resolveModel(
    userId: string,
    target: { usage: AIUsage } | { modelId: string }
): Promise<ResolvedModel> {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('obter_modelo_ia', {
        p_usuario_id: userId,
        p_uso: 'usage' in target ? target.usage : null,
        p_modelo_id: 'modelId' in target ? target.modelId : null,
    })
    if (error) throw error

    const row = (data as ModelRow[] | null)?.[0]
    if (row) return build(row.provedor, row.modelo, row.api_key)

    if ('modelId' in target) throw new Error('Modelo não encontrado')

    if (process.env.GROQ_API_KEY) return build('groq', 'openai/gpt-oss-20b', process.env.GROQ_API_KEY)
    if (process.env.OPENAI_API_KEY) return build('openai', 'gpt-4o-mini', process.env.OPENAI_API_KEY)
    throw new AIModelNotConfiguredError(target.usage)
}

/** Mensagem segura para o usuário a partir de um erro do provedor. */
export function describeAIError(error: unknown): { message: string; status: number } {
    if (error instanceof AIModelNotConfiguredError) return { message: error.message, status: 412 }
    if (error instanceof ServerConfigError) return { message: error.message, status: 500 }
    // APICallError traz statusCode; após retries ele vem em RetryError.lastError
    const err = error as { statusCode?: number; lastError?: { statusCode?: number } }
    const status = err?.statusCode ?? err?.lastError?.statusCode
    if (status === 401 || status === 403) {
        return { message: 'A API key do modelo foi recusada pelo provedor. Confira em Configurações → IA.', status: 502 }
    }
    if (status === 404) {
        return { message: 'O provedor não encontrou o modelo configurado. Confira o nome em Configurações → IA.', status: 502 }
    }
    if (status === 429) {
        return { message: 'Limite de uso do provedor de IA atingido. Tente novamente em instantes.', status: 429 }
    }
    return { message: 'Não foi possível falar com o modelo de IA agora.', status: 500 }
}
