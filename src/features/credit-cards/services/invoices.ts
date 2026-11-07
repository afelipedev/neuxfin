import type { SupabaseClient } from '@supabase/supabase-js'
import { dateInMonthClamped, formatDateToISO, parseLocalDate } from '@/lib/utils'
import { fromCents, scopeToUser, toCents, todayISO } from '@/features/bank-accounts/services/balances'

/**
 * Faturas de cartão de crédito (calculadas, não armazenadas).
 *
 * Regras:
 * - Compra no cartão = despesa com cartao_id e sem conta_id; a data da compra é data_vencimento.
 * - Ciclo: a fatura fecha no dia_fechamento. Compras ATÉ o dia anterior ao fechamento entram na
 *   fatura que fecha nesse mês; compras no dia do fechamento ou depois vão para a seguinte
 *   (o dia do fechamento é o "melhor dia de compra").
 * - Vencimento: se dia_vencimento > dia_fechamento, vence no mesmo mês do fechamento; senão, no mês
 *   seguinte. A competência da fatura é o mês do vencimento ("fatura de dezembro").
 * - Dias inexistentes no mês (31 em fevereiro) são limitados ao último dia.
 * - Pagar a fatura (RPC pagar_fatura) debita UMA conta e liquida as compras. O pagamento não é
 *   despesa (a compra já foi contada no mês dela), só movimenta o saldo da conta.
 * - Pagamento parcial: o que não foi pago (saldo_restante) vira o "saldo da fatura anterior"
 *   da competência seguinte. Ele soma no total/em aberto dela e no limite usado até ser pago,
 *   mas não é compra nem despesa (a despesa já foi contada nas compras).
 * - Limite usado = soma das compras em aberto (inclui parcelas futuras) + saldos carregados.
 */

export interface CardInfo {
    id: string
    nome: string
    bandeira?: string | null
    limite: number | string | null
    dia_fechamento: number
    dia_vencimento: number
    cor?: string | null
}

export interface CardPurchase {
    id: string
    cartao_id: string
    descricao: string
    valor: number | string
    data_vencimento: string
    status: 'liquidado' | 'pendente' | 'atrasado'
    fatura_pagamento_id: string | null
    parcela_atual?: number | null
    total_parcelas?: number | null
    categoria?: { nome: string } | null
}

export interface InvoicePayment {
    id: string
    cartao_id: string
    /** YYYY-MM-01 */
    competencia: string
    conta_id: string
    valor: number | string
    data_pagamento: string
    estornado_em: string | null
    /** Valor que ficou sem pagar e foi para a fatura seguinte (pagamento parcial) */
    saldo_restante?: number | string | null
    conta?: { nome: string } | null
}

/** aberta = ciclo atual; futura = parcelas de ciclos seguintes; fechada = aguardando vencimento. */
/** parcial = paga com saldo restante levado para a próxima fatura. */
export type InvoiceStatus = 'aberta' | 'futura' | 'fechada' | 'vencida' | 'paga' | 'parcial'

export interface Invoice {
    cartao_id: string
    /** YYYY-MM (mês de vencimento) */
    key: string
    fechamento: string
    vencimento: string
    total: number
    /** Saldo não pago da fatura anterior (pagamento parcial), incluído em total */
    saldo_anterior: number
    em_aberto: number
    compras: CardPurchase[]
    pagamento: InvoicePayment | null
    status: InvoiceStatus
}

type CardCycle = Pick<CardInfo, 'dia_fechamento' | 'dia_vencimento'>

const monthKey = (year: number, monthIndex: number) => {
    const d = new Date(year, monthIndex, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const parseKey = (key: string) => {
    const [y, m] = key.split('-').map(Number)
    return { year: y, monthIndex: m - 1 }
}

/** Vencimento no mesmo mês do fechamento? */
const dueSameMonth = (card: CardCycle) => card.dia_vencimento > card.dia_fechamento

/** Competência (YYYY-MM do vencimento) da fatura em que cai uma compra feita em `date`. */
export function invoiceKeyForDate(date: string, card: CardCycle): string {
    const d = parseLocalDate(date.slice(0, 10))
    const year = d.getFullYear()
    const month = d.getMonth()
    const closeDay = dateInMonthClamped(year, month, card.dia_fechamento).getDate()
    const closeMonth = d.getDate() >= closeDay ? month + 1 : month
    return monthKey(year, dueSameMonth(card) ? closeMonth : closeMonth + 1)
}

/** Datas de fechamento e vencimento de uma fatura. */
export function invoiceDates(key: string, card: CardCycle): { fechamento: string; vencimento: string } {
    const { year, monthIndex } = parseKey(key)
    const closeMonth = dueSameMonth(card) ? monthIndex : monthIndex - 1
    return {
        fechamento: formatDateToISO(dateInMonthClamped(year, closeMonth, card.dia_fechamento)),
        vencimento: formatDateToISO(dateInMonthClamped(year, monthIndex, card.dia_vencimento))
    }
}

/** Soma o mês de uma competência (YYYY-MM). */
export function shiftInvoiceKey(key: string, delta: number): string {
    const { year, monthIndex } = parseKey(key)
    return monthKey(year, monthIndex + delta)
}

export const keyToCompetencia = (key: string) => `${key}-01`

/** Agrupa as compras do cartão em faturas, com status e pagamento. Ordenadas por competência. */
export function buildInvoices(
    card: CardInfo,
    purchases: CardPurchase[],
    payments: InvoicePayment[],
    today: string = todayISO()
): Invoice[] {
    const currentKey = invoiceKeyForDate(today, card)
    const byKey = new Map<string, CardPurchase[]>()

    for (const p of purchases) {
        if (p.cartao_id !== card.id) continue
        const key = invoiceKeyForDate(p.data_vencimento, card)
        const list = byKey.get(key)
        if (list) list.push(p)
        else byKey.set(key, [p])
    }

    const activePayments = new Map<string, InvoicePayment>()
    for (const pay of payments) {
        if (pay.cartao_id !== card.id || pay.estornado_em) continue
        const key = pay.competencia.slice(0, 7)
        activePayments.set(key, pay)
        if (!byKey.has(key)) byKey.set(key, [])
        // O saldo restante aparece na fatura seguinte, mesmo que ela não tenha compras
        const nextKey = shiftInvoiceKey(key, 1)
        if (toCents(pay.saldo_restante) > 0 && !byKey.has(nextKey)) byKey.set(nextKey, [])
    }

    return [...byKey.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, compras]) => {
            const { fechamento, vencimento } = invoiceDates(key, card)
            let total = 0
            let aberto = 0
            for (const c of compras) {
                const cents = toCents(c.valor)
                total += cents
                if (c.status !== 'liquidado') aberto += cents
            }
            const pagamento = activePayments.get(key) ?? null
            const anterior = toCents(activePayments.get(shiftInvoiceKey(key, -1))?.saldo_restante)
            total += anterior
            // Com pagamento, o saldo anterior já foi quitado por ele
            if (!pagamento) aberto += anterior

            let status: InvoiceStatus
            if (aberto === 0 && pagamento && toCents(pagamento.saldo_restante) > 0) status = 'parcial'
            else if (aberto === 0 && (pagamento || total > 0)) status = 'paga'
            else if (today < fechamento) status = key <= currentKey ? 'aberta' : 'futura'
            else if (today <= vencimento) status = 'fechada'
            else status = 'vencida'

            compras.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))

            return {
                cartao_id: card.id,
                key,
                fechamento,
                vencimento,
                total: fromCents(total),
                saldo_anterior: fromCents(anterior),
                em_aberto: fromCents(aberto),
                compras,
                pagamento,
                status
            }
        })
}

/**
 * Limite usado (compras em aberto, inclusive parcelas futuras, + saldo de pagamento parcial
 * ainda não quitado pela fatura seguinte) e disponível.
 */
export function cardLimitUsage(
    card: CardInfo,
    purchases: CardPurchase[],
    payments: InvoicePayment[] = []
): { usado: number; disponivel: number } {
    const compras = purchases.reduce(
        (acc, p) => (p.cartao_id === card.id && p.status !== 'liquidado' ? acc + toCents(p.valor) : acc),
        0
    )
    const ativos = payments.filter(p => p.cartao_id === card.id && !p.estornado_em)
    const pagas = new Set(ativos.map(p => p.competencia.slice(0, 7)))
    const carregado = ativos.reduce(
        (acc, p) => (pagas.has(shiftInvoiceKey(p.competencia.slice(0, 7), 1)) ? acc : acc + toCents(p.saldo_restante)),
        0
    )
    const usado = compras + carregado
    return { usado: fromCents(usado), disponivel: fromCents(toCents(card.limite) - usado) }
}

/** Valor em aberto das faturas (de todos os cartões) que vencem até `until` (inclui vencidas). */
export function openInvoicesUntil(invoices: Invoice[], until: string): number {
    return fromCents(
        invoices.reduce(
            (acc, inv) => (inv.status !== 'paga' && inv.vencimento <= until ? acc + toCents(inv.em_aberto) : acc),
            0
        )
    )
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
    aberta: 'Aberta',
    futura: 'Futura',
    fechada: 'Fechada',
    vencida: 'Vencida',
    paga: 'Paga',
    parcial: 'Paga parcialmente'
}

// ---------- Acesso a dados ----------

const PAGE_SIZE = 1000

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

export interface CardOverview extends CardInfo {
    usado: number
    disponivel: number
    invoices: Invoice[]
    /** Fatura do ciclo atual (pode não existir se não há compras) */
    fatura_atual: Invoice | null
    /** Fatura fechada/vencida mais antiga ainda não paga */
    fatura_pendente: Invoice | null
}

export interface CardsOverview {
    cards: CardOverview[]
    invoices: Invoice[]
}

/** Cartões com faturas, limite usado e faturas pendentes. Uma consulta por tabela. */
export async function fetchCardsOverview(
    supabase: SupabaseClient,
    today: string = todayISO(),
    /** Obrigatório com client service-role */
    userId?: string
): Promise<CardsOverview> {
    const [cardsRes, purchases, payments] = await Promise.all([
        scopeToUser(supabase.from('cartoes_credito').select('*'), userId).order('nome'),
        fetchAll<CardPurchase>((from, to) =>
            scopeToUser(supabase
                .from('transacoes')
                .select('id, cartao_id, descricao, valor, data_vencimento, status, fatura_pagamento_id, parcela_atual, total_parcelas, categoria:categorias(nome)')
                .not('cartao_id', 'is', null)
                .eq('tipo_transacao', 'despesa'), userId)
                .order('id')
                .range(from, to)
        ),
        fetchAll<InvoicePayment>((from, to) =>
            scopeToUser(supabase
                .from('faturas_pagamentos')
                .select('id, cartao_id, competencia, conta_id, valor, saldo_restante, data_pagamento, estornado_em, conta:contas_bancarias(nome)')
                .is('estornado_em', null), userId)
                .order('id')
                .range(from, to)
        )
    ])
    if (cardsRes.error) throw cardsRes.error

    const allInvoices: Invoice[] = []
    const cards = ((cardsRes.data ?? []) as CardInfo[]).map(card => {
        const invoices = buildInvoices(card, purchases, payments, today)
        allInvoices.push(...invoices)
        const currentKey = invoiceKeyForDate(today, card)
        return {
            ...card,
            ...cardLimitUsage(card, purchases, payments),
            invoices,
            fatura_atual: invoices.find(i => i.key === currentKey) ?? null,
            fatura_pendente: invoices.find(i => i.status === 'fechada' || i.status === 'vencida') ?? null
        }
    })

    return { cards, invoices: allInvoices }
}

export async function payInvoice(
    supabase: SupabaseClient,
    params: {
        cartaoId: string
        invoiceKey: string
        contaId: string
        dataPagamento: string
        transacaoIds: string[]
        /** Valor pago; ausente = fatura inteira. Menor que o devido = pagamento parcial */
        valor?: number | null
    }
) {
    const { data, error } = await supabase.rpc('pagar_fatura', {
        p_cartao_id: params.cartaoId,
        p_competencia: keyToCompetencia(params.invoiceKey),
        p_conta_id: params.contaId,
        p_data_pagamento: params.dataPagamento,
        p_transacao_ids: params.transacaoIds,
        p_valor: params.valor ?? null
    })
    if (error) throw error
    return data as InvoicePayment
}

export async function reverseInvoicePayment(supabase: SupabaseClient, pagamentoId: string) {
    const { error } = await supabase.rpc('estornar_fatura', { p_pagamento_id: pagamentoId })
    if (error) throw error
}
