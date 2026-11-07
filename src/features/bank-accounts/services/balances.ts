import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO } from '@/lib/utils'

/**
 * Fonte única de verdade para cálculos de saldo.
 *
 * Regras:
 * - Saldo da conta em D = saldo_inicial + entradas − saídas liquidadas da conta com data
 *   efetiva ≤ D. Movimentos considerados:
 *     · transações (receita +, despesa −), data efetiva = data_pagamento (ou vencimento);
 *     · transferências (destino +, origem −);
 *     · cofrinho com conta vinculada (resgate +, aporte −);
 *     · pagamento de fatura de cartão (−). As compras no cartão não têm conta e não entram;
 *     · ajuste de saldo/conciliação (valor com sinal). Não é receita nem despesa.
 * - Se a conta tem data_saldo_inicial, movimentos anteriores a ela são ignorados
 *   (já estão refletidos no saldo inicial).
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
export type MovementOrigin = 'transacao' | 'transferencia' | 'cofrinho' | 'fatura' | 'ajuste'

export interface BalanceTx {
    id?: string
    conta_id: string | null
    tipo_transacao: TxKind
    valor: number | string
    status: TxStatus
    data_vencimento: string
    data_pagamento: string | null
    /** Ausente = transação comum. Transferências/cofrinho entram como movimentos liquidados. */
    origem?: MovementOrigin
}

export interface BalanceAccount {
    id: string
    saldo_inicial: number | string | null
    data_saldo_inicial?: string | null
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

/**
 * Status considerando vencimento: pendente com vencimento passado é "atrasado".
 * Compra no cartão (data_vencimento = data da compra) não atrasa por si: quem vence é a fatura.
 */
export function deriveStatus(
    tx: Pick<BalanceTx, 'status' | 'data_vencimento'> & { cartao_id?: string | null },
    today: string = todayISO()
): TxStatus {
    if (tx.status === 'liquidado') return 'liquidado'
    if (tx.cartao_id) return 'pendente'
    return isoDay(tx.data_vencimento) < today ? 'atrasado' : 'pendente'
}

const isOpen = (tx: Pick<BalanceTx, 'status'>) => tx.status !== 'liquidado'

/** Valor com sinal em centavos (entrada +, saída −). */
export const signedCents = (tx: Pick<BalanceTx, 'tipo_transacao' | 'valor'>): number =>
    tx.tipo_transacao === 'receita' ? toCents(tx.valor) : -toCents(tx.valor)

/** Movimento liquidado que entra no saldo considerando a data de corte do saldo inicial. */
const countsForBalance = (tx: BalanceTx, asOf: string, desde?: string | null) => {
    if (tx.status !== 'liquidado') return false
    const data = effectiveDate(tx)
    return data <= asOf && (!desde || data >= isoDay(desde))
}

// ---------- Cálculos puros ----------

/** Saldo de uma conta numa data (os movimentos devem pertencer à conta). */
export function computeAccountBalance(
    saldoInicial: number | string | null,
    txs: BalanceTx[],
    asOf: string = todayISO(),
    desde?: string | null
): number {
    const cents = txs.reduce(
        (acc, tx) => (countsForBalance(tx, asOf, desde) ? acc + signedCents(tx) : acc),
        toCents(saldoInicial)
    )
    return fromCents(cents)
}

/** Saldos de várias contas de uma vez, a partir de uma única lista de movimentos. */
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
        saldo_atual: computeAccountBalance(
            account.saldo_inicial,
            byAccount.get(account.id) ?? [],
            asOf,
            account.data_saldo_inicial
        )
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
 * Extrato da conta no período [from, to]: apenas movimentos liquidados,
 * ordenados pela data efetiva, com saldo corrido.
 */
export function buildStatement<T extends BalanceTx>(
    saldoInicial: number | string | null,
    txs: T[],
    from: string,
    to: string,
    desde?: string | null
): Statement<T> {
    const liquidated = txs
        .filter(tx => countsForBalance(tx, to, desde))
        .map(tx => ({ tx, data: effectiveDate(tx) }))
        .sort((a, b) => (a.data === b.data ? 0 : a.data < b.data ? -1 : 1))

    let running = toCents(saldoInicial)
    let entradas = 0
    let saidas = 0
    const rows: StatementRow<T>[] = []

    for (const { tx, data } of liquidated) {
        const cents = signedCents(tx)
        running += cents
        if (data < from) continue
        if (cents >= 0) entradas += cents
        else saidas -= cents
        rows.push({ tx, data, valor_assinado: fromCents(cents), saldo_apos: fromCents(running) })
    }

    return {
        saldo_anterior: fromCents(running - entradas + saidas),
        entradas: fromCents(entradas),
        saidas: fromCents(saidas),
        saldo_final: fromCents(running),
        rows
    }
}

// ---------- Movimentos de transferências e cofrinhos ----------

export interface TransferRow {
    id: string
    conta_origem_id: string
    conta_destino_id: string
    valor: number | string
    data: string
    descricao: string | null
}

export interface CofrinhoMovRow {
    id: string
    tipo: 'aporte' | 'resgate'
    valor: number | string
    data: string
    conta_id: string
    cofrinho: { nome: string } | null
}

/** Movimento exibível no extrato (transação, transferência ou cofrinho). */
export interface StatementTx extends BalanceTx {
    id: string
    origem: MovementOrigin
    /** id do registro de origem (transferência/movimento de cofrinho) */
    ref_id: string
    descricao: string
    categoria: { nome: string } | null
}

/** Converte transferências em movimentos: saída na origem e entrada no destino. */
export function transfersToMovements(rows: TransferRow[], contaId?: string): StatementTx[] {
    const out: StatementTx[] = []
    for (const t of rows) {
        const data = isoDay(t.data)
        const base = {
            valor: t.valor,
            status: 'liquidado' as const,
            data_vencimento: data,
            data_pagamento: data,
            origem: 'transferencia' as const,
            ref_id: t.id,
            categoria: { nome: 'Transferência' }
        }
        if (!contaId || t.conta_origem_id === contaId) {
            out.push({
                ...base,
                id: `transferencia:${t.id}:saida`,
                conta_id: t.conta_origem_id,
                tipo_transacao: 'despesa',
                descricao: t.descricao || 'Transferência enviada'
            })
        }
        if (!contaId || t.conta_destino_id === contaId) {
            out.push({
                ...base,
                id: `transferencia:${t.id}:entrada`,
                conta_id: t.conta_destino_id,
                tipo_transacao: 'receita',
                descricao: t.descricao || 'Transferência recebida'
            })
        }
    }
    return out
}

/** Aporte no cofrinho = saída da conta; resgate = entrada na conta. */
export function cofrinhoToMovements(rows: CofrinhoMovRow[]): StatementTx[] {
    return rows.map(m => {
        // data é timestamptz: converter para o dia local
        const data = formatDateToISO(new Date(m.data))
        const nome = m.cofrinho?.nome ?? 'cofrinho'
        return {
            id: `cofrinho:${m.id}`,
            ref_id: m.id,
            origem: 'cofrinho' as const,
            conta_id: m.conta_id,
            tipo_transacao: m.tipo === 'resgate' ? 'receita' : 'despesa',
            valor: m.valor,
            status: 'liquidado' as const,
            data_vencimento: data,
            data_pagamento: data,
            descricao: m.tipo === 'resgate' ? `Resgate do cofrinho ${nome}` : `Aporte no cofrinho ${nome}`,
            categoria: { nome: 'Cofrinho' }
        }
    })
}

export interface InvoicePaymentRow {
    id: string
    conta_id: string
    competencia: string
    valor: number | string
    data_pagamento: string
    cartao: { nome: string } | null
}

/** Pagamento de fatura = saída da conta na data do pagamento. */
export function invoicePaymentsToMovements(rows: InvoicePaymentRow[]): StatementTx[] {
    return rows.map(p => {
        const data = isoDay(p.data_pagamento)
        const [ano, mes] = p.competencia.slice(0, 7).split('-')
        return {
            id: `fatura:${p.id}`,
            ref_id: p.id,
            origem: 'fatura' as const,
            conta_id: p.conta_id,
            tipo_transacao: 'despesa' as const,
            valor: p.valor,
            status: 'liquidado' as const,
            data_vencimento: data,
            data_pagamento: data,
            descricao: `Pagamento da fatura ${p.cartao?.nome ?? 'do cartão'} (${mes}/${ano})`,
            categoria: { nome: 'Cartão de crédito' }
        }
    })
}

export interface AdjustmentRow {
    id: string
    conta_id: string
    /** Com sinal: positivo aumenta o saldo, negativo diminui */
    valor: number | string
    data: string
    descricao: string | null
}

/** Ajuste de saldo = entrada (valor positivo) ou saída (negativo) na conta. */
export function adjustmentsToMovements(rows: AdjustmentRow[]): StatementTx[] {
    return rows.map(a => {
        const data = isoDay(a.data)
        const cents = toCents(a.valor)
        return {
            id: `ajuste:${a.id}`,
            ref_id: a.id,
            origem: 'ajuste' as const,
            conta_id: a.conta_id,
            tipo_transacao: cents >= 0 ? 'receita' : 'despesa',
            valor: fromCents(Math.abs(cents)),
            status: 'liquidado' as const,
            data_vencimento: data,
            data_pagamento: data,
            descricao: a.descricao || 'Ajuste de saldo',
            categoria: { nome: 'Ajuste de saldo' }
        }
    })
}

/**
 * Diferença (com sinal) para o saldo calculado bater com o saldo informado pelo usuário.
 * Ex.: calculado 1.000, banco 950 → −50.
 */
export function reconciliationDelta(saldoCalculado: number, saldoInformado: number | string): number {
    return fromCents(toCents(saldoInformado) - toCents(saldoCalculado))
}

// ---------- Acesso a dados (cliente injetado: browser ou server) ----------

const PAGE_SIZE = 1000
const BALANCE_TX_COLUMNS = 'id, conta_id, tipo_transacao, valor, status, data_vencimento, data_pagamento'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function assertUuid(id: string) {
    if (!UUID_RE.test(id)) throw new Error('Identificador de conta inválido')
}

/**
 * Restringe a consulta a um usuário. Obrigatório com o client service-role (bot do Telegram,
 * automações), que ignora RLS; com o client do usuário logado o RLS já faz isso.
 */
export function scopeToUser<Q>(query: Q, userId: string | undefined, column = 'usuario_id'): Q {
    if (!userId) return query
    if (!UUID_RE.test(userId)) throw new Error('Usuário inválido')
    return (query as unknown as { eq(column: string, value: string): Q }).eq(column, userId)
}

/** Transferências, cofrinho, pagamentos de fatura e ajustes de saldo que tocam contas (de uma conta, se informada). */
async function fetchNonTransactionMovements(supabase: SupabaseClient, contaId?: string, userId?: string): Promise<StatementTx[]> {
    if (contaId) assertUuid(contaId)

    const [transfers, cofrinho, faturas, ajustes] = await Promise.all([
        fetchAll<TransferRow>((from, to) => {
            let query = supabase
                .from('transferencias')
                .select('id, conta_origem_id, conta_destino_id, valor, data, descricao')
                .order('id')
                .range(from, to)
            query = scopeToUser(query, userId)
            if (contaId) query = query.or(`conta_origem_id.eq.${contaId},conta_destino_id.eq.${contaId}`)
            return query
        }),
        fetchAll<CofrinhoMovRow>((from, to) => {
            // cofrinho_transacoes não tem usuario_id: filtra pelo dono do cofrinho
            let query = supabase
                .from('cofrinho_transacoes')
                .select(userId ? 'id, tipo, valor, data, conta_id, cofrinho:cofrinhos!inner(nome, usuario_id)' : 'id, tipo, valor, data, conta_id, cofrinho:cofrinhos(nome)')
                .not('conta_id', 'is', null)
                .order('id')
                .range(from, to)
            query = scopeToUser(query, userId, 'cofrinho.usuario_id')
            if (contaId) query = query.eq('conta_id', contaId)
            return query
        }),
        fetchAll<InvoicePaymentRow>((from, to) => {
            let query = supabase
                .from('faturas_pagamentos')
                .select('id, conta_id, competencia, valor, data_pagamento, cartao:cartoes_credito(nome)')
                .is('estornado_em', null)
                .order('id')
                .range(from, to)
            query = scopeToUser(query, userId)
            if (contaId) query = query.eq('conta_id', contaId)
            return query
        }),
        fetchAll<AdjustmentRow>((from, to) => {
            let query = supabase
                .from('ajustes_saldo')
                .select('id, conta_id, valor, data, descricao')
                .is('removido_em', null)
                .order('id')
                .range(from, to)
            query = scopeToUser(query, userId)
            if (contaId) query = query.eq('conta_id', contaId)
            return query
        })
    ])

    return [
        ...transfersToMovements(transfers, contaId),
        ...cofrinhoToMovements(cofrinho),
        ...invoicePaymentsToMovements(faturas),
        ...adjustmentsToMovements(ajustes)
    ]
}

/** Todos os movimentos vinculados a contas (transações liquidadas/em aberto + transferências + cofrinho). */
export async function fetchAccountTransactions(supabase: SupabaseClient, contaId?: string, userId?: string): Promise<BalanceTx[]> {
    if (contaId) assertUuid(contaId)
    const [txs, extras] = await Promise.all([
        fetchAll<BalanceTx>((from, to) => {
            let query = supabase
                .from('transacoes')
                .select(BALANCE_TX_COLUMNS)
                .not('conta_id', 'is', null)
                .order('id')
                .range(from, to)
            query = scopeToUser(query, userId)
            if (contaId) query = query.eq('conta_id', contaId)
            return query
        }),
        fetchNonTransactionMovements(supabase, contaId, userId)
    ])
    return [...txs, ...extras]
}

/** Movimentos de uma conta com dados de exibição (para o extrato). */
export async function fetchStatementTransactions(supabase: SupabaseClient, contaId: string): Promise<StatementTx[]> {
    assertUuid(contaId)
    const [txs, extras] = await Promise.all([
        fetchAll<Omit<StatementTx, 'origem' | 'ref_id'>>((from, to) =>
            supabase
                .from('transacoes')
                .select(`${BALANCE_TX_COLUMNS}, descricao, categoria:categorias(nome)`)
                .eq('conta_id', contaId)
                .order('id')
                .range(from, to)
        ),
        fetchNonTransactionMovements(supabase, contaId)
    ])
    return [
        ...txs.map(tx => ({ ...tx, origem: 'transacao' as const, ref_id: tx.id })),
        ...extras
    ]
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

/** Contas com saldo atual + saldo disponível. */
export async function fetchBalanceOverview<A extends BalanceAccount = BalanceAccount>(
    supabase: SupabaseClient,
    asOf: string = todayISO(),
    /** Obrigatório com client service-role */
    userId?: string
): Promise<BalanceOverview<A>> {
    const [{ data: accountsData, error }, transactions] = await Promise.all([
        scopeToUser(supabase.from('contas_bancarias').select('*'), userId).order('nome'),
        fetchAccountTransactions(supabase, undefined, userId)
    ])
    if (error) throw error

    const accounts = computeAccountBalances((accountsData ?? []) as A[], transactions, asOf)
    return { accounts, saldo_disponivel: sumBalances(accounts), transactions }
}
