import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO, parseLocalDate } from '@/lib/utils'
import { fetchBalanceOverview, fromCents, toCents, todayISO } from '@/features/bank-accounts/services/balances'

/**
 * Relatório de saúde financeira de um período (últimos N meses, incluindo o atual).
 * Totais por competência (data_vencimento), como no dashboard.
 *
 * Indicadores:
 * - Taxa de poupança = (receitas − despesas) ÷ receitas do período.
 * - Comprometimento = despesas fixas (recorrentes + parceladas) ÷ receitas do período.
 * - Autonomia = (saldo disponível + cofrinhos) ÷ despesa média mensal: quantos meses
 *   o patrimônio líquido cobre sem novas receitas.
 */

export interface ReportTx {
    valor: number | string
    tipo_transacao: 'receita' | 'despesa'
    tipo: 'PF' | 'PJ'
    data_vencimento: string
    is_recorrente: boolean | null
    total_parcelas: number | null
    categoria: { nome: string; cor: string | null } | null
}

export interface ReportCofrinho {
    nome: string
    objetivo: number | string | null
    saldo_atual: number | string | null
    data_prevista: string | null
}

export interface MonthTotals {
    key: string
    name: string
    receitas: number
    despesas: number
    pf: { receitas: number; despesas: number }
    pj: { receitas: number; despesas: number }
}

export interface CategoryTotal {
    name: string
    value: number
    color?: string
    /** Variação do último mês do período vs o anterior (null sem base de comparação) */
    variacao: number | null
}

export interface ReportData {
    months: MonthTotals[]
    receitas: number
    despesas: number
    resultado: number
    taxa_poupanca: number | null
    comprometimento: number | null
    autonomia_meses: number | null
    despesa_media_mensal: number
    saldo_disponivel: number
    total_cofrinhos: number
    categorias: CategoryTotal[]
    cofrinhos: Array<{ nome: string; saldo: number; objetivo: number; progresso: number; data_prevista: string | null }>
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** Intervalo dos últimos `months` meses terminando no mês de `today`. */
export function reportRange(months: number, today: string = todayISO()) {
    const t = parseLocalDate(today)
    const start = new Date(t.getFullYear(), t.getMonth() - (months - 1), 1)
    const end = new Date(t.getFullYear(), t.getMonth() + 1, 0)
    const keys: string[] = []
    for (let i = 0; i < months; i++) keys.push(keyOf(new Date(start.getFullYear(), start.getMonth() + i, 1)))
    return { from: formatDateToISO(start), to: formatDateToISO(end), keys }
}

const ratio = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null)

/** Puro: monta o relatório a partir das transações do período (testável). */
export function buildReport(input: {
    keys: string[]
    txs: ReportTx[]
    saldoDisponivel: number
    cofrinhos: ReportCofrinho[]
}): ReportData {
    const { keys, txs } = input
    const byMonth = new Map(keys.map(k => [k, { receitas: 0, despesas: 0, pfR: 0, pfD: 0, pjR: 0, pjD: 0 }]))
    const catByMonth = new Map<string, Map<string, number>>()
    const catTotals = new Map<string, { value: number; color?: string }>()
    let fixas = 0

    for (const tx of txs) {
        const key = tx.data_vencimento.slice(0, 7)
        const m = byMonth.get(key)
        if (!m) continue
        const cents = toCents(tx.valor)
        const pj = tx.tipo === 'PJ'
        if (tx.tipo_transacao === 'receita') {
            m.receitas += cents
            if (pj) m.pjR += cents
            else m.pfR += cents
            continue
        }
        m.despesas += cents
        if (pj) m.pjD += cents
        else m.pfD += cents
        if (tx.is_recorrente || (tx.total_parcelas ?? 0) > 1) fixas += cents

        const cat = tx.categoria?.nome ?? 'Sem categoria'
        const total = catTotals.get(cat)
        if (total) total.value += cents
        else catTotals.set(cat, { value: cents, color: tx.categoria?.cor ?? undefined })
        const perMonth = catByMonth.get(key) ?? new Map<string, number>()
        perMonth.set(cat, (perMonth.get(cat) ?? 0) + cents)
        catByMonth.set(key, perMonth)
    }

    const months: MonthTotals[] = keys.map(key => {
        const m = byMonth.get(key)!
        const monthIndex = Number(key.slice(5, 7)) - 1
        return {
            key,
            name: `${MONTH_NAMES[monthIndex]}/${key.slice(2, 4)}`,
            receitas: fromCents(m.receitas),
            despesas: fromCents(m.despesas),
            pf: { receitas: fromCents(m.pfR), despesas: fromCents(m.pfD) },
            pj: { receitas: fromCents(m.pjR), despesas: fromCents(m.pjD) }
        }
    })

    const receitas = months.reduce((acc, m) => acc + toCents(m.receitas), 0)
    const despesas = months.reduce((acc, m) => acc + toCents(m.despesas), 0)

    // Compara o último mês com o anterior (no mês corrente a comparação é parcial)
    const lastKey = keys[keys.length - 1]
    const prevKey = keys[keys.length - 2]
    const last = catByMonth.get(lastKey)
    const prev = prevKey ? catByMonth.get(prevKey) : undefined

    const categorias: CategoryTotal[] = [...catTotals.entries()]
        .map(([name, { value, color }]) => {
            const base = prev?.get(name) ?? 0
            const atual = last?.get(name) ?? 0
            return { name, value: fromCents(value), color, variacao: base > 0 ? ratio(atual - base, base) : null }
        })
        .sort((a, b) => b.value - a.value)

    // Despesa média dos meses com movimento (evita diluir com meses vazios)
    const mesesComDespesa = months.filter(m => m.despesas > 0).length
    const despesaMedia = mesesComDespesa > 0 ? Math.round(despesas / mesesComDespesa) : 0
    const totalCofrinhos = input.cofrinhos.reduce((acc, c) => acc + toCents(c.saldo_atual), 0)
    const patrimonio = toCents(input.saldoDisponivel) + totalCofrinhos

    return {
        months,
        receitas: fromCents(receitas),
        despesas: fromCents(despesas),
        resultado: fromCents(receitas - despesas),
        taxa_poupanca: ratio(receitas - despesas, receitas),
        comprometimento: ratio(fixas, receitas),
        autonomia_meses: despesaMedia > 0 ? Math.round((patrimonio / despesaMedia) * 10) / 10 : null,
        despesa_media_mensal: fromCents(despesaMedia),
        saldo_disponivel: input.saldoDisponivel,
        total_cofrinhos: fromCents(totalCofrinhos),
        categorias,
        cofrinhos: input.cofrinhos
            .filter(c => Number(c.objetivo || 0) > 0)
            .map(c => {
                const saldo = Number(c.saldo_atual || 0)
                const objetivo = Number(c.objetivo || 0)
                return {
                    nome: c.nome,
                    saldo,
                    objetivo,
                    progresso: Math.min(100, Math.round((saldo / objetivo) * 100)),
                    data_prevista: c.data_prevista
                }
            })
            .sort((a, b) => b.progresso - a.progresso)
    }
}

const PAGE_SIZE = 1000

/** Busca os dados do período e monta o relatório (cliente injetado: browser ou server). */
export async function fetchReport(supabase: SupabaseClient, months: number): Promise<ReportData> {
    const { from, to, keys } = reportRange(months)

    const txs: ReportTx[] = []
    for (let start = 0; ; start += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('transacoes')
            .select('valor, tipo_transacao, tipo, data_vencimento, is_recorrente, total_parcelas, categoria:categorias(nome, cor)')
            .gte('data_vencimento', from)
            .lte('data_vencimento', to)
            .order('id')
            .range(start, start + PAGE_SIZE - 1)
        if (error) throw error
        const page = (data ?? []) as unknown as ReportTx[]
        txs.push(...page)
        if (page.length < PAGE_SIZE) break
    }

    const [overview, cofrinhosRes] = await Promise.all([
        fetchBalanceOverview(supabase),
        supabase.from('cofrinhos').select('nome, objetivo, saldo_atual, data_prevista')
    ])
    if (cofrinhosRes.error) throw cofrinhosRes.error

    return buildReport({
        keys,
        txs,
        saldoDisponivel: overview.saldo_disponivel,
        cofrinhos: (cofrinhosRes.data ?? []) as ReportCofrinho[]
    })
}
