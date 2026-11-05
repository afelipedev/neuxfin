import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO } from '@/lib/utils'

/**
 * Fonte única de verdade para cálculos de saldo.
 *
 * Regras:
 * - Saldo da conta em D = saldo_inicial + receitas liquidadas − despesas liquidadas
 *   da conta cuja data efetiva (data_pagamento, ou data_vencimento se ausente) ≤ D.
 * - Saldo Disponível = soma dos saldos de todas as contas em "hoje".
 * - Saldo Previsto até D = Saldo Disponível + receitas pendentes − despesas pendentes/atrasadas
 *   vinculadas a contas com data_vencimento ≤ D.
 * - Transações liquidadas sem conta não afetam saldo (são sinalizadas à parte).
 * - Valores são somados em centavos para evitar erros de ponto flutuante.
 *
 * As funções puras abaixo não acessam o Supabase e podem ser testadas isoladamente.
 */

export type TxStatus = 'liquidado' | 'pendente' | 'atrasado'
export type TxKind = 'receita' | 'despesa'

export interface BalanceTx {
    id?: string
    conta_id: string | null
    tipo_transacao: TxKind
    valor: number | string
    status: TxStatus
    data_vencimento: string
    data_pagamento: string | null
}

export interface BalanceAccount {
    id: string
    saldo_inicial: number | string | null
}

// ---------- Helpers ----------

export const toCents = (valor: number | string | null | undefined): number =>
    Math.round(Number(valor || 0) * 100)

export const fromCents = (cents: number): number => cents / 100

/** Normaliza para "YYYY-MM-DD" (permite comparação lexical segura). */
const isoDay = (date: string): string => date.slice(0, 10)

export const todayISO = (): string => formatDateToISO(new Date())

/** Data em que a transação efetivamente movimentou o saldo. */
export function effectiveDate(tx: Pick<BalanceTx, 'data_pagamento' | 'data_vencimento'>): string {
    return isoDay(tx.data_pagamento || tx.data_vencimento)
}

/** Status considerando vencimento: pendente com vencimento passado é "atrasado". */
export function deriveStatus(
    tx: Pick<BalanceTx, 'status' | 'data_vencimento'>,
    today: string = todayISO()
): TxStatus {
    if (tx.status === 'liquidado') return 'liquidado'
    return isoDay(tx.data_vencimento) < today ? 'atrasado' : 'pendente'
}

const isOpen = (tx: Pick<BalanceTx, 'status'>) => tx.status !== 'liquidado'

/** Valor com sinal em centavos (receita +, despesa −). */
export const signedCents = (tx: Pick<BalanceTx, 'tipo_transacao' | 'valor'>): number =>
    tx.tipo_transacao === 'receita' ? toCents(tx.valor) : -toCents(tx.valor)

// ---------- Cálculos puros ----------

/** Saldo de uma conta numa data (as transações devem pertencer à conta). */
export function computeAccountBalance(
    saldoInicial: number | string | null,
    txs: BalanceTx[],
    asOf: string = todayISO()
): number {
    const cents = txs.reduce((acc, tx) => {
        if (tx.status !== 'liquidado' || effectiveDate(tx) > asOf) return acc
        return acc + signedCents(tx)
    }, toCents(saldoInicial))
    return fromCents(cents)
}

/** Saldos de várias contas de uma vez, a partir de uma única lista de transações. */
export function computeAccountBalances<A extends BalanceAccount>(
    accounts: A[],
    txs: BalanceTx[],
    asOf: string = todayISO()
): Array<A & { saldo_atual: number }> {
    const byAccount = new Map<string, BalanceTx[]>()
    for (const tx of txs) {
        if (!tx.conta_id) continue
        const list = byAccount.get(tx.conta_id)
        if (list) list.push(tx)
        else byAccount.set(tx.conta_id, [tx])
    }
    return accounts.map(account => ({
        ...account,
        saldo_atual: computeAccountBalance(account.saldo_inicial, byAccount.get(account.id) ?? [], asOf)
    }))
}

/** Soma de saldos (em centavos para evitar drift). */
export function sumBalances(accounts: Array<{ saldo_atual: number }>): number {
    return fromCents(accounts.reduce((acc, a) => acc + toCents(a.saldo_atual), 0))
}

/**
 * Saldo previsto: saldo disponível + lançamentos em aberto (com conta) com vencimento ≤ until.
 * Inclui atrasados (vencimento passado), pois ainda precisam ser pagos/recebidos.
 */
export function computeProjectedBalance(
    availableBalance: number,
    txs: BalanceTx[],
    until: string
): { saldo_previsto: number; receitas_a_receber: number; despesas_a_pagar: number } {
    let receber = 0
    let pagar = 0
    for (const tx of txs) {
        if (!tx.conta_id || !isOpen(tx) || isoDay(tx.data_vencimento) > until) continue
        if (tx.tipo_transacao === 'receita') receber += toCents(tx.valor)
        else pagar += toCents(tx.valor)
    }
    return {
        saldo_previsto: fromCents(toCents(availableBalance) + receber - pagar),
        receitas_a_receber: fromCents(receber),
        despesas_a_pagar: fromCents(pagar)
    }
}

export interface StatementRow<T extends BalanceTx> {
    tx: T
    data: string
    valor_assinado: number
    saldo_apos: number
}

export interface Statement<T extends BalanceTx> {
    saldo_anterior: number
    entradas: number
    saidas: number
    saldo_final: number
    rows: StatementRow<T>[]
}

/**
 * Extrato da conta no período [from, to]: apenas lançamentos liquidados,
 * ordenados pela data efetiva, com saldo corrido.
 */
export function buildStatement<T extends BalanceTx>(
    saldoInicial: number | string | null,
    txs: T[],
    from: string,
    to: string
): Statement<T> {
    const liquidated = txs
        .filter(tx => tx.status === 'liquidado')
        .map(tx => ({ tx, data: effectiveDate(tx) }))
        .sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? -1 : 1))

    let running = toCents(saldoInicial)
    let entradas = 0
    let saidas = 0
    const rows: StatementRow<T>[] = []

    for (const { tx, data } of liquidated) {
        if (data > to) break
        const cents = signedCents(tx)
        running += cents
        if (data < from) continue
        if (cents >= 0) entradas += cents
        else saidas -= cents
        rows.push({ tx, data, valor_assinado: fromCents(cents), saldo_apos: fromCents(running) })
    }

    const saldoFinal = fromCents(running)
    return {
        saldo_anterior: fromCents(running - entradas + saidas),
        entradas: fromCents(entradas),
        saidas: fromCents(saidas),
        saldo_final: saldoFinal,
        rows
    }
}

// ---------- Acesso a dados (cliente injetado: browser ou server) ----------

const PAGE_SIZE = 1000
const BALANCE_TX_COLUMNS = 'id, conta_id, tipo_transacao, valor, status, data_vencimento, data_pagamento'

/**
 * Busca todas as linhas paginando (o PostgREST limita a 1000 por requisição,
 * o que truncaria silenciosamente saldos cumulativos).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await build(from, from + PAGE_SIZE - 1)
        if (error) throw error
        const page = (data ?? []) as T[]
        rows.push(...page)
        if (page.length < PAGE_SIZE) return rows
    }
}

/** Todas as transações vinculadas a contas (liquidadas e em aberto). */
export function fetchAccountTransactions(supabase: SupabaseClient, contaId?: string): Promise<BalanceTx[]> {
    return fetchAll<BalanceTx>((from, to) => {
        let query = supabase
            .from('transacoes')
            .select(BALANCE_TX_COLUMNS)
            .not('conta_id', 'is', null)
            .order('id')
            .range(from, to)
        if (contaId) query = query.eq('conta_id', contaId)
        return query
    })
}

export interface StatementTx extends BalanceTx {
    id: string
    descricao: string
    categoria: { nome: string } | null
}

/** Transações de uma conta com dados de exibição (para o extrato). */
export function fetchStatementTransactions(supabase: SupabaseClient, contaId: string): Promise<StatementTx[]> {
    return fetchAll<StatementTx>((from, to) =>
        supabase
            .from('transacoes')
            .select(`${BALANCE_TX_COLUMNS}, descricao, categoria:categorias(nome)`)
            .eq('conta_id', contaId)
            .order('id')
            .range(from, to)
    )
}

/** Quantidade de transações liquidadas sem conta e fora de cartão (não entram em nenhum saldo). */
export async function countLiquidatedWithoutAccount(supabase: SupabaseClient): Promise<number> {
    const { count, error } = await supabase
        .from('transacoes')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'liquidado')
        .is('conta_id', null)
        .is('cartao_id', null)
    if (error) throw error
    return count ?? 0
}

export interface BalanceOverview<A extends BalanceAccount> {
    accounts: Array<A & { saldo_atual: number }>
    saldo_disponivel: number
    transactions: BalanceTx[]
}

/** Contas com saldo atual + saldo disponível, com 2 queries no total. */
export async function fetchBalanceOverview<A extends BalanceAccount = BalanceAccount>(
    supabase: SupabaseClient,
    asOf: string = todayISO()
): Promise<BalanceOverview<A>> {
    const [{ data: accountsData, error }, transactions] = await Promise.all([
        supabase.from('contas_bancarias').select('*').order('nome'),
        fetchAccountTransactions(supabase)
    ])
    if (error) throw error

    const accounts = computeAccountBalances((accountsData ?? []) as A[], transactions, asOf)
    return { accounts, saldo_disponivel: sumBalances(accounts), transactions }
}
