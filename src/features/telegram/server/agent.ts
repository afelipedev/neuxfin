import { generateText, stepCountIs, tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveModel } from '@/features/ai-models/server/resolve-model'
import {
    addTransactionCore,
    addTransactionSchema,
    getBalanceCore,
    getBalanceSchema,
    getRecentTransactionsCore,
    getTransactionsSchema,
    getUpcomingBillsCore,
    getUpcomingBillsSchema,
} from '@/features/ai-chat/tools/finance-tools'

const system = () => `Você é o "Amigão", assistente financeiro do NeuxFin, conversando pelo Telegram.

PERSONALIDADE: descontraído, levemente sarcástico e muito útil. Gírias leves ("bora", "beleza", "só dale").

O QUE FAZER:
- Relato de gasto ou ganho ("gastei", "paguei", "recebi", "vence dia") → registre com add_transaction.
  · pago=true quando o dinheiro já saiu/entrou; pago=false para contas a pagar/receber no futuro.
  · Se o usuário citar o banco/conta ("no Nubank"), informe conta_nome.
  · Infira a categoria pelo contexto (ex.: "almoço" → Alimentação, "uber" → Transporte).
  · Se faltar o valor, pergunte antes de registrar. Não invente valores.
- Perguntas de saldo → get_balance (fale do saldo_disponivel). Gastos recentes → get_recent_transactions.
  Contas e faturas a vencer → get_upcoming_bills.
- Assuntos fora de finanças: responda em uma frase que você cuida só das finanças.

FORMATO (Telegram, texto puro):
- Sem Markdown: nada de **, #, tabelas ou blocos de código. Pode usar emojis com moderação e "• " para listas.
- Valores como R$ 1.234,56 e datas como 10/11/2026.
- Depois de registrar, confirme em 1 ou 2 linhas: tipo, valor, descrição, data e conta (ou avise que ficou sem conta).
- No máximo ~8 linhas.

Hoje é ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Datas nas ferramentas em YYYY-MM-DD.`

/**
 * Agente financeiro do bot. `supabase` é o client service-role: TODAS as ferramentas
 * recebem userId e filtram por usuario_id.
 */
export async function runFinanceAgent(supabase: SupabaseClient, userId: string, message: string): Promise<string> {
    const resolved = await resolveModel(userId, { usage: 'chat' })

    const { text } = await generateText({
        model: resolved.model,
        providerOptions: resolved.providerOptions,
        system: system(),
        prompt: message,
        stopWhen: stepCountIs(5),
        tools: {
            get_balance: tool({
                description: 'Saldo disponível hoje (soma das contas), saldo de cada conta, saldo previsto para o fim do mês e resumo de receitas/despesas do mês.',
                inputSchema: getBalanceSchema,
                execute: ({ month, year }) => getBalanceCore(supabase, month, year, userId),
            }),
            get_recent_transactions: tool({
                description: 'Transações recentes (receitas ou despesas).',
                inputSchema: getTransactionsSchema,
                execute: ({ limit, type }) =>
                    getRecentTransactionsCore(supabase, limit && limit > 0 ? Math.min(limit, 50) : 10, type ?? 'todos', userId),
            }),
            get_upcoming_bills: tool({
                description: 'Contas e faturas de cartão a vencer nos próximos dias (inclui atrasadas).',
                inputSchema: getUpcomingBillsSchema,
                execute: ({ days }) => getUpcomingBillsCore(supabase, days && days > 0 ? Math.min(days, 90) : 7, userId),
            }),
            add_transaction: tool({
                description: 'Registra uma receita ou despesa do usuário.',
                inputSchema: addTransactionSchema,
                execute: params => addTransactionCore(supabase, userId, params),
            }),
        },
    })

    return text.trim() || 'Feito! 👍'
}
