import { createClient } from '@/lib/supabase/client'
import type { AIProvider } from './providers'

const supabase = createClient()

/** Metadados do modelo. A API key nunca é lida pelo client (só os 4 últimos caracteres). */
export interface AIModelConfig {
    id: string
    nome: string
    provedor: AIProvider
    modelo: string
    chave_final: string
    usar_chat: boolean
    usar_analise: boolean
    created_at: string
}

export interface SaveAIModelInput {
    id?: string
    nome: string
    provedor: AIProvider
    modelo: string
    /** Obrigatória ao criar; vazia na edição mantém a chave atual */
    api_key?: string
    usar_chat: boolean
    usar_analise: boolean
}

export async function listAIModels(): Promise<AIModelConfig[]> {
    const { data, error } = await supabase
        .from('modelos_ia')
        .select('id, nome, provedor, modelo, chave_final, usar_chat, usar_analise, created_at')
        .order('created_at')
    if (error) throw error
    return (data ?? []) as AIModelConfig[]
}

export async function saveAIModel(input: SaveAIModelInput): Promise<string> {
    const { data, error } = await supabase.rpc('salvar_modelo_ia', {
        p_id: input.id ?? null,
        p_nome: input.nome,
        p_provedor: input.provedor,
        p_modelo: input.modelo,
        p_api_key: input.api_key ?? null,
        p_usar_chat: input.usar_chat,
        p_usar_analise: input.usar_analise,
    })
    if (error) throw error
    return data as string
}

export async function removeAIModel(id: string): Promise<void> {
    const { error } = await supabase.rpc('remover_modelo_ia', { p_id: id })
    if (error) throw error
}

/** Faz uma chamada mínima ao modelo pelo servidor para validar chave e nome do modelo. */
export async function testAIModel(id: string): Promise<{ ok: boolean; message: string }> {
    const res = await fetch('/api/ai-models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    })
    const body = await res.json().catch(() => ({}))
    return { ok: res.ok, message: body?.message ?? body?.error ?? (res.ok ? 'Conexão OK' : 'Falha no teste') }
}
