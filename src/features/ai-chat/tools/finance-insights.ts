import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO, parseLocalDate } from '@/lib/utils'
import { deriveStatus, fromCents, scopeToUser, toCents, todayISO } from '@/features/bank-accounts/services/balances'
import { fetchCardsOverview, INVOICE_STATUS_LABEL } from '@/features/credit-cards/services/invoices'
import { fetchBudgetProgress } from '@/features/budgets/services/budgets'
import { displaySubscriptionStatus, monthlyCost, subscriptionOccurrences, type SubscriptionFrequency } from '@/features/subscriptions/services/schedule'

/**
 * Ferramentas de consulta da IA para as demais áreas do app (assinaturas, cartões, cofrinhos,
 * orçamentos, gastos por categoria, busca de transações) e a ação "marcar como pago".
 *
 * Mesma regra das funções de finance-tools.ts: com o client service-role (Telegram) o `userId`
 * é obrigatório e TODA consulta passa por scopeToUser.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const likeLiteral = (s: string) => s.replace(/[%_\\]/g, ch => `\\${ch}`)
const validDate = (d?: string | null) => (d && DATE_RE.test(d.slice(0, 10)) ? d.slice(0, 10) : null)

const monthRange = (month?: number | null, year?: number | null) => {
    const now = new Date()
    const m = month && month >= 1 && month <= 12 ? month : now.getMonth() + 1
    const y = year || now.getFullYear()
    return {
        month: m,
        year: y,
        start: formatDateToISO(new Date(y, m - 1, 1)),
        end: formatDateToISO(new Date(y, m, 0)),
    }
}

// ---------- Schemas ----------

export const getSubscriptionsSchema = z.object({
    status: z.enum(['ativo', 'pausado', 'cancelado', 'encerrado', 'todas']).nullish().describe('Filtrar por status (encerrado = passou da data de encerramento). Padrão: ativo.'),
})

export const getCardsSchema = z.object({})

export const getSavingsSchema = z.object({})

export const monthSchema = z.object({
    month: z.number().int().nullish().describe('Mês (1-12). Omita para o mês atual.'),
    year: z.number().int().nullish().describe('Ano. Omita para o ano atual.'),
})

export const getSpendingByCategorySchema = monthSchema.extend({
    tipo_transacao: z.enum(['despesa', 'receita']).nullish().describe('Padrão: despesa.'),
})

export const searchTransactionsSchema = z.object({
    busca: z.string().nullish().describe('Texto na descrição (ex.: "luz", "uber").'),
    tipo: z.enum(['receita', 'despesa', 'todos']).nullish().describe('Padrão: todos.'),
    status: z.enum(['pendente', 'atrasado', 'liquidado', 'todos']).nullish().describe('pendente inclui atrasados. Padrão: todos.'),
    categoria_nome: z.string().nullish().describe('Nome da categoria (ex.: "Alimentação").'),
    data_inicio: z.string().nullish().describe('YYYY-MM-DD, pela data de vencimento/compra.'),
    data_fim: z.string().nullish().describe('YYYY-MM-DD, pela data de vencimento/compra.'),
    limit: z.number().int().nullish().describe('Máximo de resultados. Padrão: 15.'),
})

export const markTransactionPaidSchema = z.object({
    transacao_id: z.string().describe('id da transação (obtido com search_transactions).'),
    data_pagamento: z.string().nullish().describe('YYYY-MM-DD. Padrão: hoje.'),
    conta_nome: z.string().nullish().describe('Conta usada no pagamento/recebimento. Padrão: a conta da transação ou a padrão.'),
})

// ---------- Cores ----------

interface SubscriptionRow {
    nome: string
    valor: number | string
    status: 'ativo' | 'pausado' | 'cancelado'
    data_fim: string | null
    frequencia: SubscriptionFrequency | null
    data_vencimento_dia: number | null
    data_inicio: string
    cartao: { nome: string } | null
    conta: { nome: string } | null
}

/** Próxima cobrança a partir de hoje (procura até 13 meses à frente). */
export function nextSubscriptionCharge(sub: Pick<SubscriptionRow, 'frequencia' | 'data_vencimento_dia' | 'data_inicio'> & { data_fim?: string | null }, today: string): string | null {
    const base = parseLocalDate(today)
    for (let i = 0; i <= 13; i++) {
        const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
        const next = subscriptionOccurrences(sub, d.getFullYear(), d.getMonth() + 1).find(o => o >= today)
        if (next) return next
    }
    return null
}

export async function getSubscriptionsCore(supabase: SupabaseClient, status: 'ativo' | 'pausado' | 'cancelado' | 'encerrado' | 'todas', userId?: string) {
    const { data, error } = await scopeToUser(supabase
        .from('assinaturas')
        .select('nome, valor, status, frequencia, data_vencimento_dia, data_inicio, data_fim, cartao:cartoes_credito(nome), conta:contas_bancarias(nome)'), userId)
        .order('nome')
    if (error) throw new Error(`Erro ao buscar assinaturas: ${error.message}`)

    const today = todayISO()
    // Status considerando a data de encerramento (ativa com data_fim no passado = encerrada)
    const rows = ((data ?? []) as unknown as SubscriptionRow[])
        .map(r => ({ ...r, situacao: displaySubscriptionStatus(r, today) }))
        .filter(r => status === 'todas' || r.situacao === status)
    const ativas = rows.filter(r => r.situacao === 'ativo')
    return {
        quantidade: rows.length,
        custo_mensal_das_ativas: fromCents(ativas.reduce((acc, r) => acc + toCents(monthlyCost(r.valor, r.frequencia)), 0)),
        assinaturas: rows.map(r => ({
            nome: r.nome,
            valor: Number(r.valor),
            frequencia: r.frequencia ?? 'mensal',
            status: r.situacao,
            inicio: r.data_inicio,
            encerra_em: r.data_fim,
            proxima_cobranca: r.situacao === 'ativo' ? nextSubscriptionCharge(r, today) : null,
            cobrada_em: r.cartao ? `cartão ${r.cartao.nome}` : r.conta ? `conta ${r.conta.nome}` : 'conta padrão',
        })),
    }
}

export async function getCardsCore(supabase: SupabaseClient, userId?: string) {
    const { cards } = await fetchCardsOverview(supabase, todayISO(), userId)
    const resumo = (inv: (typeof cards)[number]['fatura_atual']) => inv && ({
        competencia: inv.key,
        vencimento: inv.vencimento,
        total: inv.total,
        em_aberto: inv.em_aberto,
        status: INVOICE_STATUS_LABEL[inv.status],
    })
    return {
        cartoes: cards.map(c => ({
            nome: c.nome,
            limite: Number(c.limite || 0),
            limite_usado: c.usado,
            limite_disponivel: c.disponivel,
            fechamento_dia: c.dia_fechamento,
            vencimento_dia: c.dia_vencimento,
            fatura_atual: resumo(c.fatura_atual),
            fatura_a_pagar: resumo(c.fatura_pendente),
        })),
    }
}

export async function getSavingsCore(supabase: SupabaseClient, userId?: string) {
    const { data, error } = await scopeToUser(supabase
        .from('cofrinhos')
        .select('nome, saldo_atual, objetivo, data_prevista, tipo_liquidez'), userId)
        .order('nome')
    if (error) throw new Error(`Erro ao buscar cofrinhos: ${error.message}`)
    const rows = (data ?? []) as Array<{ nome: string; saldo_atual: number | string; objetivo: number | string | null; data_prevista: string | null; tipo_liquidez: string | null }>
    return {
        total_guardado: fromCents(rows.reduce((acc, r) => acc + toCents(r.saldo_atual), 0)),
        cofrinhos: rows.map(r => {
            const objetivo = Number(r.objetivo || 0)
            return {
                nome: r.nome,
                saldo: Number(r.saldo_atual || 0),
                objetivo: objetivo || null,
                progresso_pct: objetivo > 0 ? Math.round((Number(r.saldo_atual || 0) / objetivo) * 100) : null,
                data_prevista: r.data_prevista ? r.data_prevista.slice(0, 10) : null,
                liquidez: r.tipo_liquidez,
            }
        }),
    }
}

export async function getBudgetsCore(supabase: SupabaseClient, month?: number | null, year?: number | null, userId?: string) {
    const r = monthRange(month, year)
    const progress = await fetchBudgetProgress(supabase, r.month, r.year, userId)
    return {
        mes: r.month,
        ano: r.year,
        orcamentos: progress.map(p => ({
            categoria: p.budget.categoria?.nome ?? 'Categoria',
            perfil: p.budget.tipo ?? 'PF e PJ',
            limite: p.limite,
            gasto: p.gasto,
            restante: p.restante,
            percentual: Math.round(p.percentual * 100),
            situacao: p.status === 'estourado' ? 'estourado' : p.status === 'atencao' ? 'atenção (80%+)' : 'ok',
        })),
    }
}

/** Puro: soma por categoria em centavos, maior primeiro. */
export function groupByCategory(rows: Array<{ valor: number | string; categoria: { nome: string } | null }>) {
    const map = new Map<string, { cents: number; qtd: number }>()
    let total = 0
    for (const row of rows) {
        const nome = row.categoria?.nome ?? 'Sem categoria'
        const cents = toCents(row.valor)
        total += cents
        const cur = map.get(nome) ?? { cents: 0, qtd: 0 }
        map.set(nome, { cents: cur.cents + cents, qtd: cur.qtd + 1 })
    }
    return {
        total: fromCents(total),
        categorias: [...map.entries()]
            .sort((a, b) => b[1].cents - a[1].cents)
            .map(([categoria, v]) => ({
                categoria,
                valor: fromCents(v.cents),
                lancamentos: v.qtd,
                percentual: total > 0 ? Math.round((v.cents / total) * 100) : 0,
            })),
    }
}

export async function getSpendingByCategoryCore(
    supabase: SupabaseClient,
    month: number | null | undefined,
    year: number | null | undefined,
    tipo: 'despesa' | 'receita',
    userId?: string
) {
    const r = monthRange(month, year)
    const { data, error } = await scopeToUser(supabase
        .from('transacoes')
        .select('valor, categoria:categorias(nome)'), userId)
        .eq('tipo_transacao', tipo)
        .gte('data_vencimento', r.start)
        .lte('data_vencimento', r.end)
        .limit(5000)
    if (error) throw new Error(`Erro ao buscar gastos: ${error.message}`)
    return { mes: r.month, ano: r.year, tipo, ...groupByCategory((data ?? []) as unknown as Array<{ valor: number; categoria: { nome: string } | null }>) }
}

export async function searchTransactionsCore(supabase: SupabaseClient, f: z.infer<typeof searchTransactionsSchema>, userId?: string) {
    const limit = f.limit && f.limit > 0 ? Math.min(f.limit, 50) : 15
    const categoria = f.categoria_nome?.trim()
    let query = scopeToUser(supabase
        .from('transacoes')
        .select(`id, descricao, valor, tipo_transacao, status, data_vencimento, data_pagamento, cartao_id,
            categoria:categorias${categoria ? '!inner' : ''}(nome), conta:contas_bancarias(nome), cartao:cartoes_credito(nome)`), userId)
        .order('data_vencimento', { ascending: false })
        .limit(limit)

    if (f.busca?.trim()) query = query.ilike('descricao', `%${likeLiteral(f.busca.trim())}%`)
    if (categoria) query = query.ilike('categoria.nome', `%${likeLiteral(categoria)}%`)
    if (f.tipo && f.tipo !== 'todos') query = query.eq('tipo_transacao', f.tipo)
    if (f.status === 'liquidado') query = query.eq('status', 'liquidado')
    if (f.status === 'pendente' || f.status === 'atrasado') query = query.neq('status', 'liquidado')
    if (f.status === 'atrasado') query = query.lt('data_vencimento', todayISO()).is('cartao_id', null)
    const inicio = validDate(f.data_inicio)
    const fim = validDate(f.data_fim)
    if (inicio) query = query.gte('data_vencimento', inicio)
    if (fim) query = query.lte('data_vencimento', fim)

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar transações: ${error.message}`)
    const today = todayISO()
    type Row = {
        id: string; descricao: string; valor: number | string; tipo_transacao: 'receita' | 'despesa'
        status: 'liquidado' | 'pendente' | 'atrasado'; data_vencimento: string; data_pagamento: string | null; cartao_id: string | null
        categoria: { nome: string } | null; conta: { nome: string } | null; cartao: { nome: string } | null
    }
    const rows = (data ?? []) as unknown as Row[]
    return {
        quantidade: rows.length,
        transacoes: rows.map(t => ({
            id: t.id,
            descricao: t.descricao,
            valor: Number(t.valor),
            tipo: t.tipo_transacao,
            status: deriveStatus(t, today),
            vencimento: t.data_vencimento,
            pagamento: t.data_pagamento,
            categoria: t.categoria?.nome ?? null,
            onde: t.cartao ? `cartão ${t.cartao.nome}` : t.conta?.nome ?? 'sem conta',
        })),
    }
}

/**
 * Marca uma receita/despesa pendente como liquidada. Compras no cartão não: elas são
 * quitadas pelo pagamento da fatura.
 */
export async function markTransactionPaidCore(supabase: SupabaseClient, userId: string, p: z.infer<typeof markTransactionPaidSchema>) {
    if (!UUID_RE.test(userId)) throw new Error('Usuário inválido.')
    if (!UUID_RE.test(p.transacao_id)) return { success: false, erro: 'id de transação inválido. Use search_transactions para obter o id.' }

    const { data: tx, error } = await supabase
        .from('transacoes')
        .select('id, descricao, valor, tipo_transacao, status, conta_id, cartao_id')
        .eq('id', p.transacao_id)
        .eq('usuario_id', userId)
        .maybeSingle()
    if (error) throw new Error(`Erro ao buscar transação: ${error.message}`)
    if (!tx) return { success: false, erro: 'Transação não encontrada.' }
    if (tx.status === 'liquidado') return { success: false, erro: 'Essa transação já está paga/recebida.' }
    if (tx.cartao_id) return { success: false, erro: 'Compra no cartão é quitada pelo pagamento da fatura, no app (Cartões).' }

    const { data: contas, error: contasError } = await supabase
        .from('contas_bancarias')
        .select('id, nome, padrao')
        .eq('usuario_id', userId)
    if (contasError) throw new Error(`Erro ao buscar contas: ${contasError.message}`)
    const lista = (contas ?? []) as Array<{ id: string; nome: string; padrao: boolean }>
    const citada = p.conta_nome ? lista.find(c => c.nome.toLowerCase().includes(p.conta_nome!.toLowerCase())) : undefined
    if (p.conta_nome && !citada) {
        return { success: false, erro: `Não achei a conta "${p.conta_nome}". Contas: ${lista.map(c => c.nome).join(', ')}.` }
    }
    const conta = citada ?? lista.find(c => c.id === tx.conta_id) ?? lista.find(c => c.padrao) ?? (lista.length === 1 ? lista[0] : undefined)
    const data = validDate(p.data_pagamento) ?? todayISO()

    const { error: updError } = await supabase
        .from('transacoes')
        .update({ status: 'liquidado', data_pagamento: data, conta_id: conta?.id ?? tx.conta_id })
        .eq('id', tx.id)
        .eq('usuario_id', userId)
    if (updError) throw new Error(`Erro ao atualizar: ${updError.message}`)

    return {
        success: true,
        descricao: tx.descricao,
        valor: Number(tx.valor),
        tipo: tx.tipo_transacao,
        data_pagamento: data,
        conta: conta?.nome ?? null,
        aviso: conta ? undefined : 'Ficou sem conta bancária: não altera nenhum saldo até ser vinculada.',
    }
}
