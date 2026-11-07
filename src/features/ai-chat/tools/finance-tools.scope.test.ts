import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

// O módulo importa o client de servidor (cookies); não é usado nas funções *Core
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { getBalanceCore, getRecentTransactionsCore, getUpcomingBillsCore } from './finance-tools'
import {
    getBudgetsCore,
    getCardsCore,
    getSavingsCore,
    getSpendingByCategoryCore,
    getSubscriptionsCore,
    markTransactionPaidCore,
    searchTransactionsCore,
} from './finance-insights'

const USER = '11111111-2222-4333-8444-555555555555'

interface Recorded { table: string; filters: Array<[string, unknown]> }

/**
 * Client falso: registra cada consulta (tabela + filtros eq) e devolve lista vazia.
 * Serve para garantir que, com o client service-role, nenhuma consulta sai sem usuario_id.
 */
function fakeClient() {
    const queries: Recorded[] = []
    const builder = (rec: Recorded): unknown => {
        const proxy: unknown = new Proxy(() => {}, {
            get(_target, prop) {
                if (prop === 'then') {
                    return (resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 })
                }
                return (...args: unknown[]) => {
                    if (prop === 'eq') rec.filters.push([String(args[0]), args[1]])
                    return proxy
                }
            },
        })
        return proxy
    }
    const client = {
        from(table: string) {
            const rec: Recorded = { table, filters: [] }
            queries.push(rec)
            return builder(rec)
        },
    } as unknown as SupabaseClient
    return { client, queries }
}

const scoped = (q: Recorded) => q.filters.some(([col, val]) => (col === 'usuario_id' || col === 'cofrinho.usuario_id') && val === USER)

describe('funções *Core com client service-role', () => {
    it.each([
        ['get_balance', (c: SupabaseClient) => getBalanceCore(c, 11, 2026, USER)],
        ['get_recent_transactions', (c: SupabaseClient) => getRecentTransactionsCore(c, 5, 'todos', USER)],
        ['get_upcoming_bills', (c: SupabaseClient) => getUpcomingBillsCore(c, 7, USER)],
        ['get_subscriptions', (c: SupabaseClient) => getSubscriptionsCore(c, 'todas', USER)],
        ['get_credit_cards', (c: SupabaseClient) => getCardsCore(c, USER)],
        ['get_savings', (c: SupabaseClient) => getSavingsCore(c, USER)],
        ['get_budgets', (c: SupabaseClient) => getBudgetsCore(c, 11, 2026, USER)],
        ['get_spending_by_category', (c: SupabaseClient) => getSpendingByCategoryCore(c, 11, 2026, 'despesa', USER)],
        ['search_transactions', (c: SupabaseClient) => searchTransactionsCore(c, { busca: 'luz', categoria_nome: 'Casa', status: 'atrasado' }, USER)],
        ['mark_transaction_paid', (c: SupabaseClient) => markTransactionPaidCore(c, USER, { transacao_id: '99999999-2222-4333-8444-555555555555' })],
    ])('%s filtra TODAS as consultas por usuario_id', async (_name, run) => {
        const { client, queries } = fakeClient()
        await run(client)
        expect(queries.length).toBeGreaterThan(0)
        expect(queries.filter(q => !scoped(q)).map(q => q.table)).toEqual([])
    })

    it('o detector funciona: sem userId as consultas saem sem filtro (RLS do client do usuário)', async () => {
        const { client, queries } = fakeClient()
        await getBalanceCore(client, 11, 2026)
        expect(queries.some(q => !scoped(q))).toBe(true)
    })

    it('rejeita userId inválido', async () => {
        const { client } = fakeClient()
        await expect(getRecentTransactionsCore(client, 5, 'todos', 'abc')).rejects.toThrow('Usuário inválido')
    })
})
