import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO } from '@/lib/utils'
import {
    computeProjectedBalance,
    fetchBalanceOverview,
    fromCents,
    scopeToUser,
    toCents,
    todayISO
} from '@/features/bank-accounts/services/balances'
import { fetchCardsOverview, openInvoicesUntil } from '@/features/credit-cards/services/invoices'

// --- Tool Schemas ---

// Opcionais usam .nullish(): alguns modelos (ex.: gpt-oss na Groq) enviam null em vez de
// omitir o campo, e o provedor valida os argumentos contra o schema. Padrões ficam no código.

export const getBalanceSchema = z.object({
    month: z.number().int().nullish().describe('Mês numérico (1-12). Omita para o mês atual.'),
    year: z.number().int().nullish().describe('Ano (ex: 2026). Omita para o ano atual.')
})

export const getTransactionsSchema = z.object({
    limit: z.number().int().nullish().describe('Número de transações para buscar. Padrão: 10.'),
    type: z.enum(['receita', 'despesa', 'todos']).nullish().describe('Filtrar por tipo. Padrão: todos.')
})

export const getUpcomingBillsSchema = z.object({
    days: z.number().int().nullish().describe('Quantos dias à frente verificar. Padrão: 7.')
})

export const addTransactionSchema = z.object({
    descricao: z.string().describe('Descrição da transação (ex: "Almoço", "Freela").'),
    valor: z.number().positive().describe('Valor da transação (positivo).'),
    tipo: z.enum(['PF', 'PJ']).nullish().describe('Perfil: PF ou PJ. Padrão: PF.'),
    tipo_transacao: z.enum(['receita', 'despesa']).describe('Se é receita ou despesa.'),
    data_vencimento: z.string().nullish().describe('Data no formato YYYY-MM-DD. Padrão: hoje.'),
    categoria_nome: z.string().nullish().describe('Nome da categoria para tentar inferir o ID.'),
    pago: z.boolean().nullish().describe(
        'true se o dinheiro JÁ saiu/entrou (ex.: "gastei", "paguei", "recebi"); false se é uma conta a pagar/receber no futuro. Padrão: false.'
    ),
    conta_nome: z.string().nullish().describe(
        'Nome da conta bancária citada pelo usuário (ex.: "Nubank"). Se omitido, usa a conta padrão do usuário.'
    ),
    cartao_nome: z.string().nullish().describe(
        'Nome do cartão de crédito quando a DESPESA foi no cartão (ex.: "no cartão Nubank", "no crédito"). Compra no cartão entra na fatura; não use conta_nome junto.'
    )
})

// --- Core Logic (Dependency Injection) ---

/**
 * Saldo para a IA: usa as mesmas regras do dashboard (features/bank-accounts/services/balances.ts).
 * - saldo_disponivel: soma das contas hoje (independe do mês).
 * - saldo_previsto: saldo disponível + lançamentos em aberto até o fim do mês.
 * - mes: receitas/despesas do mês por vencimento (competência).
 */
/**
 * As funções *Core recebem `userId` opcional: com o client do usuário (cookies) o RLS isola os
 * dados; com o client service-role (Telegram/automações) o userId é OBRIGATÓRIO e filtra
 * todas as consultas por usuario_id.
 */
export const getBalanceCore = async (supabase: SupabaseClient, month?: number | null, year?: number | null, userId?: string) => {
    const targetMonth = month && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1
    const targetYear = year || new Date().getFullYear()

    const startDate = formatDateToISO(new Date(targetYear, targetMonth - 1, 1))
    const endDate = formatDateToISO(new Date(targetYear, targetMonth, 0))

    const [{ data: transactions, error }, overview, cards] = await Promise.all([
        scopeToUser(supabase
            .from('transacoes')
            .select('valor, tipo_transacao, status')
            .gte('data_vencimento', startDate)
            .lte('data_vencimento', endDate), userId),
        fetchBalanceOverview<{ id: string; nome: string; saldo_inicial: number }>(supabase, todayISO(), userId),
        fetchCardsOverview(supabase, todayISO(), userId)
    ])

    if (error) throw new Error(`Erro ao buscar saldo: ${error.message}`)

    const mes = { receitas: 0, receitas_recebidas: 0, despesas: 0, despesas_pagas: 0 }
    for (const t of (transactions || []) as Array<{ valor: number | string; tipo_transacao: string; status: string }>) {
        const cents = toCents(t.valor)
        if (t.tipo_transacao === 'receita') {
            mes.receitas += cents
            if (t.status === 'liquidado') mes.receitas_recebidas += cents
        } else {
            mes.despesas += cents
            if (t.status === 'liquidado') mes.despesas_pagas += cents
        }
    }

    const projection = computeProjectedBalance(overview.saldo_disponivel, overview.transactions, endDate)
    const faturas = openInvoicesUntil(cards.invoices, endDate)

    return {
        month: targetMonth,
        year: targetYear,
        saldo_disponivel: overview.saldo_disponivel,
        // Mesma regra do dashboard: desconta faturas de cartão a vencer até o fim do mês
        saldo_previsto_fim_do_mes: fromCents(toCents(projection.saldo_previsto) - toCents(faturas)),
        faturas_cartao_a_pagar: faturas,
        contas: overview.accounts.map(a => ({ nome: a.nome, saldo: a.saldo_atual })),
        mes: {
            receitas: fromCents(mes.receitas),
            receitas_recebidas: fromCents(mes.receitas_recebidas),
            despesas: fromCents(mes.despesas),
            despesas_pagas: fromCents(mes.despesas_pagas),
            resultado: fromCents(mes.receitas - mes.despesas)
        }
    }
}

export const getRecentTransactionsCore = async (supabase: SupabaseClient, limit: number, type: 'todos' | 'receita' | 'despesa', userId?: string) => {
    let query = scopeToUser(supabase
        .from('transacoes')
        .select('id, descricao, valor, tipo_transacao, status, data_vencimento, categoria:categorias(nome)'), userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (type !== 'todos') {
        query = query.eq('tipo_transacao', type)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar transações: ${error.message}`)
    return data
}

/** Despesas em aberto (inclui atrasadas) até `days` dias + faturas de cartão a vencer. */
export const getUpcomingBillsCore = async (supabase: SupabaseClient, days: number, userId?: string) => {
    const today = todayISO()
    const futureDate = formatDateToISO(new Date(new Date().setDate(new Date().getDate() + days)))

    const [{ data, error }, cards] = await Promise.all([
        scopeToUser(supabase
            .from('transacoes')
            .select('descricao, valor, data_vencimento, conta:contas_bancarias(nome)'), userId)
            .eq('tipo_transacao', 'despesa')
            .neq('status', 'liquidado')
            .is('cartao_id', null)
            .lte('data_vencimento', futureDate)
            .order('data_vencimento', { ascending: true })
            .limit(50),
        fetchCardsOverview(supabase, today, userId)
    ])

    if (error) throw new Error(`Erro ao buscar contas: ${error.message}`)

    const faturas = cards.cards.flatMap(card =>
        card.invoices
            .filter(inv => inv.status !== 'paga' && inv.em_aberto > 0 && inv.vencimento <= futureDate)
            .map(inv => ({
                cartao: card.nome,
                valor: inv.em_aberto,
                vencimento: inv.vencimento,
                atrasada: inv.vencimento < today
            }))
    )

    return {
        hoje: today,
        contas: (data ?? []).map(t => ({ ...t, atrasada: t.data_vencimento < today })),
        faturas_cartao: faturas
    }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Remove curingas do LIKE para buscar o texto literal informado pelo usuário/modelo. */
const likeLiteral = (s: string) => s.replace(/[%_\\]/g, ch => `\\${ch}`)

/**
 * Cria uma transação a partir da IA (chat ou Telegram).
 * Defesa em profundidade: mesmo com o client do usuário (RLS), TODAS as consultas
 * filtram explicitamente por usuario_id.
 * Conta: a citada pelo nome → a conta padrão → a única conta do usuário → sem conta.
 */
export const addTransactionCore = async (
    supabase: SupabaseClient,
    user_id: string,
    params: z.infer<typeof addTransactionSchema>
) => {
    if (!UUID_RE.test(user_id)) throw new Error('Usuário inválido.')

    // Categoria do usuário ou global, primeiro pelo nome, depois a primeira do tipo
    let categoria_id: string | null = null
    if (params.categoria_nome) {
        const { data: cat } = await supabase
            .from('categorias')
            .select('id')
            .or(`usuario_id.eq.${user_id},usuario_id.is.null`)
            .ilike('nome', `%${likeLiteral(params.categoria_nome)}%`)
            .limit(1)
            .maybeSingle()
        if (cat) categoria_id = cat.id
    }
    if (!categoria_id) {
        const { data: defaultCat } = await supabase
            .from('categorias')
            .select('id')
            .or(`usuario_id.eq.${user_id},usuario_id.is.null`)
            .eq('tipo', params.tipo_transacao)
            .limit(1)
            .maybeSingle()
        if (defaultCat) categoria_id = defaultCat.id
    }
    if (!categoria_id) throw new Error("Não foi possível identificar uma categoria para esta transação.")

    // Compra no cartão: entra na fatura (sem conta, pendente até pagar a fatura)
    if (params.cartao_nome) {
        if (params.tipo_transacao !== 'despesa') throw new Error('Só despesas podem ser lançadas no cartão de crédito.')
        const { data: cartoes, error: cartoesError } = await supabase
            .from('cartoes_credito')
            .select('id, nome')
            .eq('usuario_id', user_id)
        if (cartoesError) throw new Error(`Erro ao buscar cartões: ${cartoesError.message}`)
        const lista = (cartoes ?? []) as Array<{ id: string; nome: string }>
        const nome = params.cartao_nome.toLowerCase()
        const cartao = lista.find(c => c.nome.toLowerCase().includes(nome) || nome.includes(c.nome.toLowerCase()))
            ?? (lista.length === 1 ? lista[0] : undefined)
        if (!cartao) {
            return {
                success: false,
                erro: lista.length
                    ? `Não achei o cartão "${params.cartao_nome}". Cartões cadastrados: ${lista.map(c => c.nome).join(', ')}.`
                    : 'Nenhum cartão de crédito cadastrado no app.',
            }
        }
        const dataCompra = params.data_vencimento && DATE_RE.test(params.data_vencimento.slice(0, 10))
            ? params.data_vencimento.slice(0, 10)
            : todayISO()
        const { data: saved, error } = await supabase
            .from('transacoes')
            .insert([{
                usuario_id: user_id,
                descricao: params.descricao,
                valor: params.valor,
                tipo: params.tipo ?? 'PF',
                tipo_transacao: 'despesa',
                categoria_id,
                conta_id: null,
                cartao_id: cartao.id,
                status: 'pendente',
                data_vencimento: dataCompra,
                data_pagamento: null,
                is_recorrente: false,
            }])
            .select('id, descricao, valor, tipo_transacao, status, data_vencimento')
            .single()
        if (error) throw new Error(`Erro ao salvar: ${error.message}`)
        return { success: true, transaction: saved, cartao: cartao.nome, aviso: 'Compra no cartão: entra na fatura e só sai da conta quando a fatura for paga.' }
    }

    const { data: contas, error: contasError } = await supabase
        .from('contas_bancarias')
        .select('id, nome, padrao')
        .eq('usuario_id', user_id)
    if (contasError) throw new Error(`Erro ao buscar contas: ${contasError.message}`)

    const lista = (contas ?? []) as Array<{ id: string; nome: string; padrao: boolean }>
    const citada = params.conta_nome
        ? lista.find(c => c.nome.toLowerCase().includes(params.conta_nome!.toLowerCase()))
        : undefined
    const conta = citada ?? lista.find(c => c.padrao) ?? (lista.length === 1 ? lista[0] : undefined)

    const data = params.data_vencimento && DATE_RE.test(params.data_vencimento.slice(0, 10))
        ? params.data_vencimento.slice(0, 10)
        : todayISO()
    const pago = params.pago === true

    const transaction = {
        usuario_id: user_id,
        descricao: params.descricao,
        valor: params.valor,
        tipo: params.tipo ?? 'PF',
        tipo_transacao: params.tipo_transacao,
        categoria_id,
        conta_id: conta?.id ?? null,
        status: pago ? 'liquidado' : 'pendente',
        data_vencimento: data,
        data_pagamento: pago ? data : null,
        is_recorrente: false
    }

    const { data: saved, error } = await supabase
        .from('transacoes')
        .insert([transaction])
        .select('id, descricao, valor, tipo_transacao, status, data_vencimento')
        .single()

    if (error) throw new Error(`Erro ao salvar: ${error.message}`)
    return {
        success: true,
        transaction: saved,
        conta: conta?.nome ?? null,
        aviso: conta
            ? undefined
            : 'Lançada sem conta bancária (nenhuma conta padrão definida). Ela não altera o saldo até ser vinculada a uma conta.'
    }
}

// --- Default Implementations (Cookie Context) ---

export const getBalance = async ({ month, year }: z.infer<typeof getBalanceSchema>) => {
    const supabase = await createClient()
    return getBalanceCore(supabase, month, year)
}

export const getRecentTransactions = async ({ limit, type }: z.infer<typeof getTransactionsSchema>) => {
    const supabase = await createClient()
    const safeLimit = limit && limit > 0 ? Math.min(limit, 50) : 10
    return getRecentTransactionsCore(supabase, safeLimit, type ?? 'todos')
}

export const getUpcomingBills = async ({ days }: z.infer<typeof getUpcomingBillsSchema>) => {
    const supabase = await createClient()
    return getUpcomingBillsCore(supabase, days && days > 0 ? Math.min(days, 90) : 7)
}

export const addTransaction = async (params: z.infer<typeof addTransactionSchema>) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Usuário não autenticado no contexto do agente.")

    return addTransactionCore(supabase, user.id, params)
}
