import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatDateToISO } from '@/lib/utils'
import {
    computeProjectedBalance,
    fetchBalanceOverview,
    fromCents,
    toCents
} from '@/features/bank-accounts/services/balances'

// --- Tool Schemas ---

export const getBalanceSchema = z.object({
    month: z.number().optional().describe('Mês numérico (1-12). Padrão: mês atual.'),
    year: z.number().optional().describe('Ano (ex: 2024). Padrão: ano atual.')
})

export const getTransactionsSchema = z.object({
    limit: z.number().optional().default(10).describe('Número de transações para buscar.'),
    type: z.enum(['receita', 'despesa', 'todos']).optional().default('todos').describe('Filtrar por tipo.')
})

export const getUpcomingBillsSchema = z.object({
    days: z.number().optional().default(7).describe('Quantos dias à frente verificar.')
})

export const addTransactionSchema = z.object({
    descricao: z.string().describe('Descrição da transação (ex: "Almoço", "Freela").'),
    valor: z.number().describe('Valor da transação.'),
    tipo: z.enum(['PF', 'PJ']).default('PF').describe('Tipo de conta (PF ou PJ).'),
    tipo_transacao: z.enum(['receita', 'despesa']).describe('Se é receita ou despesa.'),
    data_vencimento: z.string().optional().describe('Data de vencimento (ISO string). Padrão: hoje.'),
    categoria_nome: z.string().optional().describe('Nome da categoria para tentar inferir o ID.')
})

// --- Core Logic (Dependency Injection) ---

/**
 * Saldo para a IA: usa as mesmas regras do dashboard (features/bank-accounts/services/balances.ts).
 * - saldo_disponivel: soma das contas hoje (independe do mês).
 * - saldo_previsto: saldo disponível + lançamentos em aberto até o fim do mês.
 * - mes: receitas/despesas do mês por vencimento (competência).
 */
export const getBalanceCore = async (supabase: SupabaseClient, month?: number, year?: number) => {
    const targetMonth = month || new Date().getMonth() + 1
    const targetYear = year || new Date().getFullYear()

    const startDate = formatDateToISO(new Date(targetYear, targetMonth - 1, 1))
    const endDate = formatDateToISO(new Date(targetYear, targetMonth, 0))

    const [{ data: transactions, error }, overview] = await Promise.all([
        supabase
            .from('transacoes')
            .select('valor, tipo_transacao, status')
            .gte('data_vencimento', startDate)
            .lte('data_vencimento', endDate),
        fetchBalanceOverview<{ id: string; nome: string; saldo_inicial: number }>(supabase)
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

    return {
        month: targetMonth,
        year: targetYear,
        saldo_disponivel: overview.saldo_disponivel,
        saldo_previsto_fim_do_mes: projection.saldo_previsto,
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

export const getRecentTransactionsCore = async (supabase: any, limit: number, type: 'todos' | 'receita' | 'despesa') => {
    let query = supabase
        .from('transacoes')
        .select('id, descricao, valor, tipo_transacao, status, data_vencimento, categoria:categorias(nome)')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (type !== 'todos') {
        query = query.eq('tipo_transacao', type)
    }

    const { data, error } = await query
    if (error) throw new Error(`Erro ao buscar transações: ${error.message}`)
    return data
}

export const getUpcomingBillsCore = async (supabase: any, days: number) => {
    const today = formatDateToISO(new Date())
    const futureDate = formatDateToISO(new Date(new Date().setDate(new Date().getDate() + days)))

    const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('tipo_transacao', 'despesa')
        .eq('status', 'pendente')
        .gte('data_vencimento', today)
        .lte('data_vencimento', futureDate)
        .order('data_vencimento', { ascending: true })

    if (error) throw new Error(`Erro ao buscar contas: ${error.message}`)
    return data
}

export const addTransactionCore = async (supabase: any, user_id: string, params: z.infer<typeof addTransactionSchema>) => {
    // Tentar achar categoria
    let categoria_id = null
    if (params.categoria_nome) {
        const { data: cats } = await supabase
            .from('categorias')
            .select('id')
            .ilike('nome', `%${params.categoria_nome}%`)
            .limit(1)
            .single()
        if (cats) categoria_id = cats.id
    }

    if (!categoria_id) {
        const { data: defaultCat } = await supabase
            .from('categorias')
            .select('id')
            .eq('tipo', params.tipo_transacao)
            .limit(1)
            .single()
        if (defaultCat) categoria_id = defaultCat.id
    }

    if (!categoria_id) throw new Error("Não foi possível identificar uma categoria para esta transação.")

    const transaction = {
        usuario_id: user_id,
        descricao: params.descricao,
        valor: params.valor,
        tipo: params.tipo,
        tipo_transacao: params.tipo_transacao,
        categoria_id,
        status: 'pendente',
        data_vencimento: params.data_vencimento || formatDateToISO(new Date()),
        is_recorrente: false
    }

    const { data, error } = await supabase
        .from('transacoes')
        .insert([transaction])
        .select()
        .single()

    if (error) throw new Error(`Erro ao salvar: ${error.message}`)
    return { success: true, transaction: data }
}

// --- Default Implementations (Cookie Context) ---

export const getBalance = async ({ month, year }: z.infer<typeof getBalanceSchema>) => {
    const supabase = await createClient()
    return getBalanceCore(supabase, month, year)
}

export const getRecentTransactions = async ({ limit, type }: z.infer<typeof getTransactionsSchema>) => {
    const supabase = await createClient()
    return getRecentTransactionsCore(supabase, limit, type)
}

export const getUpcomingBills = async ({ days }: z.infer<typeof getUpcomingBillsSchema>) => {
    const supabase = await createClient()
    return getUpcomingBillsCore(supabase, days)
}

export const addTransaction = async (params: z.infer<typeof addTransactionSchema>) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Usuário não autenticado no contexto do agente.")

    return addTransactionCore(supabase, user.id, params)
}
