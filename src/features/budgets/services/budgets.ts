import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO } from '@/lib/utils'
import { fromCents, toCents } from '@/features/bank-accounts/services/balances'

/**
 * Orçamento mensal por categoria.
 *
 * Regras:
 * - Gasto do mês = despesas da categoria com data_vencimento no mês (competência), pagas ou não,
 *   incluindo compras no cartão. É a mesma base do card "Despesas do mês".
 * - Orçamento com tipo PF/PJ conta só as despesas daquele perfil; sem tipo conta as duas.
 * - Status: ok (< 80%), atencao (≥ 80%), estourado (> 100%).
 * - Valores somados em centavos.
 */

export type BudgetProfile = 'PF' | 'PJ'
export type BudgetStatus = 'ok' | 'atencao' | 'estourado'

export const BUDGET_WARNING_RATIO = 0.8

export interface Budget {
    id: string
    categoria_id: string
    valor_mensal: number | string
    tipo: BudgetProfile | null
    categoria?: { nome: string; cor?: string | null; icone?: string | null } | null
}

export interface BudgetExpense {
    categoria_id: string | null
    valor: number | string
    tipo: string | null
}

export interface BudgetProgress {
    budget: Budget
    gasto: number
    limite: number
    restante: number
    /** 0-∞ (1 = 100%) */
    percentual: number
    status: BudgetStatus
}

export function budgetStatus(ratio: number): BudgetStatus {
    if (ratio > 1) return 'estourado'
    if (ratio >= BUDGET_WARNING_RATIO) return 'atencao'
    return 'ok'
}

/** Puro: progresso de cada orçamento, do mais consumido para o menos. */
export function buildBudgetProgress(budgets: Budget[], expenses: BudgetExpense[]): BudgetProgress[] {
    return budgets
        .map(budget => {
            const gastoCents = expenses.reduce((acc, e) => {
                if (e.categoria_id !== budget.categoria_id) return acc
                if (budget.tipo && e.tipo !== budget.tipo) return acc
                return acc + toCents(e.valor)
            }, 0)
            const limiteCents = toCents(budget.valor_mensal)
            const percentual = limiteCents > 0 ? gastoCents / limiteCents : 0
            return {
                budget,
                gasto: fromCents(gastoCents),
                limite: fromCents(limiteCents),
                restante: fromCents(limiteCents - gastoCents),
                percentual,
                status: budgetStatus(percentual)
            }
        })
        .sort((a, b) => b.percentual - a.percentual)
}

// ---------- Acesso a dados (cliente injetado) ----------

export async function fetchBudgets(supabase: SupabaseClient): Promise<Budget[]> {
    const { data, error } = await supabase
        .from('orcamentos')
        .select('id, categoria_id, valor_mensal, tipo, categoria:categorias(nome, cor, icone)')
        .is('removido_em', null)
        .order('created_at')
    if (error) throw error
    return (data ?? []) as unknown as Budget[]
}

/** Despesas do mês (competência) com categoria, para comparar com os orçamentos. */
export async function fetchMonthExpenses(supabase: SupabaseClient, month: number, year: number): Promise<BudgetExpense[]> {
    const { data, error } = await supabase
        .from('transacoes')
        .select('categoria_id, valor, tipo')
        .eq('tipo_transacao', 'despesa')
        .not('categoria_id', 'is', null)
        .gte('data_vencimento', formatDateToISO(new Date(year, month - 1, 1)))
        .lte('data_vencimento', formatDateToISO(new Date(year, month, 0)))
        .limit(5000)
    if (error) throw error
    return (data ?? []) as BudgetExpense[]
}

export async function fetchBudgetProgress(supabase: SupabaseClient, month: number, year: number): Promise<BudgetProgress[]> {
    const [budgets, expenses] = await Promise.all([fetchBudgets(supabase), fetchMonthExpenses(supabase, month, year)])
    if (budgets.length === 0) return []
    return buildBudgetProgress(budgets, expenses)
}

export interface BudgetInput {
    categoria_id: string
    valor_mensal: number
    tipo: BudgetProfile | null
}

/** Cria ou atualiza (usuario_id vem de auth.uid() no banco). */
export async function saveBudget(supabase: SupabaseClient, input: BudgetInput, id?: string) {
    if (!(input.valor_mensal > 0)) throw new Error('O valor do orçamento deve ser maior que zero')
    const query = id
        ? supabase.from('orcamentos').update(input).eq('id', id)
        : supabase.from('orcamentos').insert([input])
    const { error } = await query
    if (error) {
        if (error.code === '23505') throw new Error('Já existe um orçamento para esta categoria')
        throw error
    }
}

/** Soft delete. */
export async function removeBudget(supabase: SupabaseClient, id: string) {
    const { error } = await supabase
        .from('orcamentos')
        .update({ removido_em: new Date().toISOString() })
        .eq('id', id)
    if (error) throw error
}
