import { generateText, stepCountIs, type ModelMessage } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveModel } from '@/features/ai-models/server/resolve-model'
import { createUserScopedClient } from '@/lib/supabase/user-token'
import { buildFinanceTools, FINANCE_TOOLS_GUIDE } from '@/features/ai-chat/tools/finance-toolset'

/** Mensagens anteriores usadas como contexto (janela curta: é uma conversa de chat). */
const HISTORY_LIMIT = 10
const HISTORY_WINDOW_MIN = 30

const system = () => `Você é o "Amigão", assistente financeiro do app NeuxFin, conversando pelo Telegram.

PERSONALIDADE: descontraído, levemente sarcástico e muito útil. Gírias leves ("bora", "beleza", "só dale").

${FINANCE_TOOLS_GUIDE}

REGISTROS:
- Infira a categoria pelo contexto (ex.: "almoço" → Alimentação, "uber" → Transporte).
- Depois de registrar, confirme em 1 ou 2 linhas: tipo, valor, descrição, data e conta/cartão (ou avise que ficou sem conta).
- Se o usuário responder a uma pergunta sua (ex.: só o valor), use o histórico da conversa para completar.

FORMATO (Telegram, texto puro):
- Sem Markdown: nada de **, #, tabelas ou blocos de código. Emojis com moderação e "• " para listas.
- Valores como R$ 1.234,56 e datas como 10/11/2026.
- Seja direto: no máximo ~10 linhas.
- Só recuse assuntos que não têm nada a ver com dinheiro ou com o app (ex.: receita de bolo), em uma frase.

Hoje é ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Datas nas ferramentas em YYYY-MM-DD.`

type Admin = SupabaseClient

async function loadHistory(supabase: Admin, userId: string, chatId: number): Promise<ModelMessage[]> {
    const since = new Date(Date.now() - HISTORY_WINDOW_MIN * 60_000).toISOString()
    const { data, error } = await supabase
        .from('telegram_mensagens')
        .select('papel, conteudo')
        .eq('usuario_id', userId)
        .eq('chat_id', chatId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT)
    if (error) {
        console.error('[telegram] histórico', error)
        return []
    }
    return ((data ?? []) as Array<{ papel: 'user' | 'assistant'; conteudo: string }>)
        .reverse()
        .map(m => ({ role: m.papel, content: m.conteudo }))
}

async function saveExchange(supabase: Admin, userId: string, chatId: number, user: string, assistant: string) {
    const { error } = await supabase.from('telegram_mensagens').insert([
        { usuario_id: userId, chat_id: chatId, papel: 'user', conteudo: user },
        { usuario_id: userId, chat_id: chatId, papel: 'assistant', conteudo: assistant },
    ])
    // Retenção (7 dias) fica com a rotina public.limpeza_rotina() no pg_cron
    if (error) console.error('[telegram] salvar histórico', error)
}

/**
 * Agente financeiro do bot.
 * - `admin` (service role) só toca no histórico da conversa (telegram_mensagens).
 * - Os dados financeiros usam um client COM O TOKEN DO USUÁRIO: a RLS do banco garante
 *   que nada de outro usuário é lido ou alterado; scopeToUser fica como segunda camada.
 */
export async function runFinanceAgent(admin: Admin, userId: string, chatId: number, message: string): Promise<string> {
    const userClient = createUserScopedClient(userId)
    const [resolved, history] = await Promise.all([
        resolveModel(userId, { usage: 'chat' }),
        loadHistory(admin, userId, chatId),
    ])

    const { text } = await generateText({
        model: resolved.model,
        providerOptions: resolved.providerOptions,
        system: system(),
        messages: [...history, { role: 'user', content: message }],
        stopWhen: stepCountIs(6),
        tools: buildFinanceTools(userClient, userId),
    })

    const reply = text.trim() || 'Feito! 👍'
    await saveExchange(admin, userId, chatId, message, reply)
    return reply
}

/** Esquece a conversa (ex.: depois de desvincular). */
export async function clearHistory(supabase: Admin, userId: string) {
    await supabase.from('telegram_mensagens').delete().eq('usuario_id', userId)
}
