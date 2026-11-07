import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO, parseLocalDate } from '@/lib/utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUserScopedClient } from '@/lib/supabase/user-token'
import { fromCents, scopeToUser, toCents } from '@/features/bank-accounts/services/balances'
import { fetchCardsOverview } from '@/features/credit-cards/services/invoices'
import { fetchBudgetProgress } from '@/features/budgets/services/budgets'
import { subscriptionOccurrences, type SubscriptionFrequency } from '@/features/subscriptions/services/schedule'
import { getBalanceCore } from '@/features/ai-chat/tools/finance-tools'
import { groupByCategory } from '@/features/ai-chat/tools/finance-insights'
import { sendMessage } from './telegram-api'
import { buildReminders, formatReminderMessage, type ReminderInput, type WeeklySummary } from './reminders'

const TIME_ZONE = 'America/Sao_Paulo'

const addDays = (iso: string, days: number) => {
    const d = parseLocalDate(iso)
    d.setDate(d.getDate() + days)
    return formatDateToISO(d)
}

/** Hora atual (0-23) e data (YYYY-MM-DD) em Brasília, independente do fuso do servidor. */
export function nowInBrasilia(date = new Date()): { hour: number; today: string; weekday: number } {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
            .formatToParts(date)
            .map(p => [p.type, p.value])
    )
    const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    return { hour: Number(parts.hour), today: `${parts.year}-${parts.month}-${parts.day}`, weekday: weekdays[parts.weekday] ?? 0 }
}

/** Carrega os dados do usuário com o client DELE (RLS) + filtro explícito por usuario_id. */
export async function loadReminderInput(db: SupabaseClient, userId: string, today: string, weekly: boolean): Promise<ReminderInput> {
    const amanha = addDays(today, 1)
    const [y, m] = today.split('-').map(Number)
    const [ay, am] = amanha.split('-').map(Number)

    const [openRes, cards, budgets, subsRes] = await Promise.all([
        scopeToUser(db.from('transacoes').select('id, descricao, valor, tipo_transacao, data_vencimento'), userId)
            .neq('status', 'liquidado')
            .is('cartao_id', null)
            .lte('data_vencimento', amanha)
            // Todas (os atrasos antigos viram só uma linha de resumo; não podem esconder as de hoje)
            .order('data_vencimento', { ascending: false })
            .limit(1000),
        fetchCardsOverview(db, today, userId),
        fetchBudgetProgress(db, m, y, userId),
        // Assinaturas no cartão: as cobradas em conta já aparecem como contas a pagar
        scopeToUser(db.from('assinaturas').select('id, nome, valor, frequencia, data_vencimento_dia, data_inicio, data_fim, cartao:cartoes_credito(nome)'), userId)
            .eq('status', 'ativo')
            .not('cartao_id', 'is', null),
    ])
    if (openRes.error) throw openRes.error
    if (subsRes.error) throw subsRes.error

    type SubRow = { id: string; nome: string; valor: number; frequencia: SubscriptionFrequency | null; data_vencimento_dia: number | null; data_inicio: string; data_fim: string | null; cartao: { nome: string } | null }
    const subscriptions = ((subsRes.data ?? []) as unknown as SubRow[])
        .filter(s => subscriptionOccurrences(s, ay, am).includes(amanha))
        .map(s => ({ id: s.id, nome: s.nome, valor: s.valor, cobranca: amanha, onde: `cartão ${s.cartao?.nome ?? ''}`.trim() }))

    let weeklySummary: WeeklySummary | null = null
    if (weekly) {
        const inicio = addDays(today, -7)
        const fim = addDays(today, -1)
        const { data, error } = await scopeToUser(db.from('transacoes').select('valor, tipo_transacao, categoria:categorias(nome)'), userId)
            .gte('data_vencimento', inicio)
            .lte('data_vencimento', fim)
            .limit(5000)
        if (error) throw error
        const rows = (data ?? []) as unknown as Array<{ valor: number; tipo_transacao: string; categoria: { nome: string } | null }>
        const despesas = rows.filter(r => r.tipo_transacao === 'despesa')
        const balance = await getBalanceCore(db, m, y, userId)
        weeklySummary = {
            despesas: fromCents(despesas.reduce((acc, r) => acc + toCents(r.valor), 0)),
            receitas: fromCents(rows.filter(r => r.tipo_transacao === 'receita').reduce((acc, r) => acc + toCents(r.valor), 0)),
            top_categorias: groupByCategory(despesas).categorias.map(c => ({ categoria: c.categoria, valor: c.valor })),
            saldo_disponivel: balance.saldo_disponivel,
            saldo_previsto_fim_do_mes: balance.saldo_previsto_fim_do_mes,
        }
    }

    return {
        today,
        openTxs: (openRes.data ?? []) as ReminderInput['openTxs'],
        invoices: cards.cards.flatMap(c => c.invoices
            .filter(i => i.status !== 'paga' && i.status !== 'parcial' && i.status !== 'futura')
            .map(i => ({ cartao_id: c.id, cartao: c.nome, key: i.key, vencimento: i.vencimento, em_aberto: i.em_aberto }))),
        budgets: budgets.map(b => ({
            id: b.budget.id,
            categoria: b.budget.categoria?.nome ?? 'Categoria',
            percentual: Math.round(b.percentual * 100),
            gasto: b.gasto,
            limite: b.limite,
            status: b.status,
        })),
        subscriptions,
        weekly: weeklySummary,
    }
}

interface Recipient { usuario_id: string; chat_id: number; resumo_semanal: boolean }

/**
 * Envia os lembretes de quem escolheu a hora atual (ou só de `onlyUserId`, para teste).
 * Cada aviso sai uma única vez (telegram_lembretes_enviados).
 */
export async function sendDueReminders(options: { hour?: number; onlyUserId?: string } = {}) {
    const admin = createAdminClient()
    const now = nowInBrasilia()
    const hour = options.hour ?? now.hour

    let query = admin
        .from('telegram_vinculos')
        .select('usuario_id, chat_id, resumo_semanal')
        .not('chat_id', 'is', null)
        .eq('lembretes_ativos', true)
    query = options.onlyUserId ? query.eq('usuario_id', options.onlyUserId) : query.eq('lembrete_hora', hour)
    const { data, error } = await query
    if (error) throw error

    const result = { hora: hour, usuarios: 0, enviados: 0, erros: 0 }
    for (const r of (data ?? []) as Recipient[]) {
        result.usuarios++
        try {
            const db = createUserScopedClient(r.usuario_id)
            const input = await loadReminderInput(db, r.usuario_id, now.today, r.resumo_semanal && now.weekday === 1)
            const items = buildReminders(input)
            if (items.length === 0) continue

            const { data: sent, error: sentError } = await admin
                .from('telegram_lembretes_enviados')
                .select('chave')
                .eq('usuario_id', r.usuario_id)
                .in('chave', items.map(i => i.key))
            if (sentError) throw sentError
            const already = new Set((sent ?? []).map(s => s.chave as string))
            const fresh = items.filter(i => !already.has(i.key))
            if (fresh.length === 0) continue

            await sendMessage(r.chat_id, formatReminderMessage(fresh))
            const { error: insError } = await admin
                .from('telegram_lembretes_enviados')
                .upsert(fresh.map(i => ({ usuario_id: r.usuario_id, chave: i.key })), { onConflict: 'usuario_id,chave', ignoreDuplicates: true })
            if (insError) console.error('[lembretes] registrar envio', insError)
            result.enviados++
        } catch (e) {
            result.erros++
            console.error('[lembretes] usuário', r.usuario_id, e)
        }
    }
    return result
}

