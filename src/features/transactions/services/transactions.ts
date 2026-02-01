import { createClient } from '@/lib/supabase/client'
import { parseLocalDate, formatDateToISO } from '@/lib/utils'

export interface Transaction {
    id: string
    usuario_id?: string
    descricao: string
    valor: number
    tipo: 'PF' | 'PJ'
    tipo_transacao: 'receita' | 'despesa'
    categoria_id: string
    categoria?: {
        id: string
        nome: string
        tipo: 'receita' | 'despesa'
        icone?: string
        cor?: string
    }
    conta_id?: string | null
    cartao_id?: string | null
    data_vencimento: string
    data_pagamento: string | null
    status: 'liquidado' | 'pendente' | 'atrasado'
    is_recorrente: boolean
    parcela_atual: number | null
    total_parcelas: number | null
    transacao_pai_id?: string | null
    created_at: string
}

export interface TransactionStats {
    total: number
    liquidado: number
    pendente: number
    atrasado: number
}

export interface TransactionFilters {
    month?: number
    year?: number
    tipo?: 'PF' | 'PJ'
    tipo_transacao?: 'receita' | 'despesa' | 'todos'
    status?: 'liquidado' | 'pendente' | 'atrasado' | 'todos'
    categoria_id?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

const supabase = createClient()

/**
 * Busca transações com filtros, paginação e ordenação
 */
export async function getTransactions(filters: TransactionFilters = {}) {
    const {
        month = new Date().getMonth() + 1,
        year = new Date().getFullYear(),
        tipo,
        tipo_transacao,
        status,
        categoria_id,
        page = 1,
        pageSize = 10,
        sortBy = 'data_vencimento',
        sortOrder = 'desc'
    } = filters

    const startDate = formatDateToISO(new Date(year, month - 1, 1))
    const endDate = formatDateToISO(new Date(year, month, 0))

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('transacoes')
        .select(`
            *,
            categoria:categorias(*)
        `, { count: 'exact' })
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)

    // Aplicar filtros
    if (tipo) {
        query = query.eq('tipo', tipo)
    }

    if (tipo_transacao && tipo_transacao !== 'todos') {
        query = query.eq('tipo_transacao', tipo_transacao)
    }

    if (status && status !== 'todos') {
        query = query.eq('status', status)
    }

    if (categoria_id) {
        query = query.eq('categoria_id', categoria_id)
    }

    // Ordenação flexível
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Paginação
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error
    return {
        data: data as Transaction[],
        count: count || 0
    }
}

/**
 * Busca estatísticas de transações
 */
export async function getTransactionStats(filters: TransactionFilters = {}): Promise<TransactionStats> {
    const {
        month = new Date().getMonth() + 1,
        year = new Date().getFullYear(),
        tipo,
        tipo_transacao
    } = filters

    const startDate = formatDateToISO(new Date(year, month - 1, 1))
    const endDate = formatDateToISO(new Date(year, month, 0))

    let query = supabase
        .from('transacoes')
        .select('valor, status')
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)

    if (tipo) {
        query = query.eq('tipo', tipo)
    }

    if (tipo_transacao && tipo_transacao !== 'todos') {
        query = query.eq('tipo_transacao', tipo_transacao)
    }

    const { data: transactions, error } = await query

    if (error) throw error

    const stats = (transactions || []).reduce((acc: TransactionStats, t: any) => {
        const valor = Number(t.valor)
        acc.total += valor

        switch (t.status) {
            case 'liquidado':
                acc.liquidado += valor
                break
            case 'pendente':
                acc.pendente += valor
                break
            case 'atrasado':
                acc.atrasado += valor
                break
        }

        return acc
    }, { total: 0, liquidado: 0, pendente: 0, atrasado: 0 })

    return stats
}

/**
 * Cria uma nova transação
 */
export async function createTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>) {
    // Pegar o usuário autenticado
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Usuário não autenticado')
    }

    const transactionData = {
        ...transaction,
        usuario_id: user.id
    }

    const { data, error } = await supabase
        .from('transacoes')
        .insert([transactionData])
        .select()
        .single()

    if (error) throw error
    return data as Transaction
}

/**
 * Cria transação parcelada
 */
export async function createParceledTransaction(
    transaction: Omit<Transaction, 'id' | 'created_at' | 'parcela_atual' | 'total_parcelas'>,
    totalParcelas: number
) {
    // Pegar o usuário autenticado
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Usuário não autenticado')
    }

    const valorTotal = Number(transaction.valor)
    const valorParcelaBase = Math.floor((valorTotal / totalParcelas) * 100) / 100
    const resto = Number((valorTotal - (valorParcelaBase * totalParcelas)).toFixed(2))

    const transacoes = []
    const dataBase = parseLocalDate(transaction.data_vencimento)

    // Criar transação pai (primeira parcela)
    const { data: transacaoPai, error: errorPai } = await supabase
        .from('transacoes')
        .insert([{
            ...transaction,
            usuario_id: user.id,
            valor: Number((valorParcelaBase + resto).toFixed(2)),
            parcela_atual: 1,
            total_parcelas: totalParcelas,
            descricao: `${transaction.descricao} (1/${totalParcelas})`
        }])
        .select()
        .single()

    if (errorPai) throw errorPai

    transacoes.push(transacaoPai)

    // Criar parcelas subsequentes
    for (let i = 2; i <= totalParcelas; i++) {
        // Calcular data: adiciona meses à data base
        const dataVencimento = new Date(dataBase)
        dataVencimento.setMonth(dataBase.getMonth() + (i - 1))

        // Ajuste para meses com menos dias (previne pular mês se hoje for dia 31)
        if (dataVencimento.getDate() !== dataBase.getDate()) {
            dataVencimento.setDate(0)
        }

        const parcela = {
            ...transaction,
            usuario_id: user.id,
            valor: valorParcelaBase,
            parcela_atual: i,
            total_parcelas: totalParcelas,
            data_vencimento: formatDateToISO(dataVencimento),
            data_pagamento: null, // Parcelas futuras sempre sem pagamento
            descricao: `${transaction.descricao} (${i}/${totalParcelas})`,
            transacao_pai_id: transacaoPai.id,
            status: 'pendente' as const
        }

        transacoes.push(parcela)
    }

    // Inserir parcelas em lote (exceto a primeira que já foi inserida)
    if (transacoes.length > 1) {
        const { error: errorParcelas } = await supabase
            .from('transacoes')
            .insert(transacoes.slice(1))

        if (errorParcelas) throw errorParcelas
    }

    return transacoes
}

/**
 * Replica transações para múltiplos meses
 */
export async function replicateTransactions(
    transactionIds: string[],
    targetMonths: { month: number, year: number }[]
) {
    // Buscar transações originais
    const { data: originalTransactions, error: fetchError } = await supabase
        .from('transacoes')
        .select('*')
        .in('id', transactionIds)

    if (fetchError) throw fetchError

    const replicatedTransactions = []

    for (const transaction of originalTransactions || []) {
        for (const targetDate of targetMonths) {
            const dataOriginal = parseLocalDate(transaction.data_vencimento)
            const dia = dataOriginal.getDate()

            // Criar nova data mantendo o dia
            const novaData = new Date(targetDate.year, targetDate.month - 1, dia)

            const newTransaction = {
                usuario_id: transaction.usuario_id,
                descricao: transaction.descricao,
                valor: transaction.valor,
                tipo: transaction.tipo,
                tipo_transacao: transaction.tipo_transacao,
                categoria_id: transaction.categoria_id,
                conta_id: transaction.conta_id,
                cartao_id: transaction.cartao_id,
                data_vencimento: formatDateToISO(novaData),
                data_pagamento: null,
                status: 'pendente' as const,
                is_recorrente: transaction.is_recorrente,
                parcela_atual: null,
                total_parcelas: null,
                transacao_pai_id: null
            }

            replicatedTransactions.push(newTransaction)
        }
    }

    // Inserir todas as transações replicadas
    const { data, error } = await supabase
        .from('transacoes')
        .insert(replicatedTransactions)
        .select()

    if (error) throw error
    return data
}

/**
 * Atualiza uma transação
 */
export async function updateTransaction(id: string, updates: Partial<Transaction>) {
    const { data, error } = await supabase
        .from('transacoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Transaction
}

/**
 * Exclui uma transação
 */
export async function deleteTransaction(id: string) {
    // Verificar se é uma transação parcelada
    const { data: transaction } = await supabase
        .from('transacoes')
        .select('total_parcelas, transacao_pai_id')
        .eq('id', id)
        .single()

    // Se for parcelada, perguntar se quer excluir todas
    if (transaction?.total_parcelas && transaction.total_parcelas > 1) {
        // Por enquanto, excluir apenas a transação específica
        // TODO: Implementar modal de confirmação para excluir todas as parcelas
    }

    const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/**
 * Exclui todas as parcelas de uma transação parcelada
 */
export async function deleteAllInstallments(transacaoPaiId: string) {
    const { error } = await supabase
        .from('transacoes')
        .delete()
        .or(`id.eq.${transacaoPaiId},transacao_pai_id.eq.${transacaoPaiId}`)

    if (error) throw error
}

/**
 * Atualiza o status de uma transação (liquidar/marcar como pendente)
 */
export async function updateTransactionStatus(
    id: string,
    status: 'liquidado' | 'pendente' | 'atrasado',
    dataPagamento?: string
) {
    const updates: Partial<Transaction> = { status }

    if (status === 'liquidado' && dataPagamento) {
        updates.data_pagamento = dataPagamento
    } else if (status === 'pendente') {
        updates.data_pagamento = null
    }

    return updateTransaction(id, updates)
}

/**
 * Busca estatísticas do dashboard
 */
export async function getDashboardStats(filters: { month?: number, year?: number } = {}) {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = filters

    const startDate = formatDateToISO(new Date(year, month - 1, 1))
    const endDate = formatDateToISO(new Date(year, month, 0))

    const { data: transactions, error } = await supabase
        .from('transacoes')
        .select('valor, tipo_transacao, status')
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)

    if (error) throw error

    const stats = (transactions || []).reduce((acc: any, t: any) => {
        const valor = Number(t.valor)
        if (t.tipo_transacao === 'receita') {
            acc.total_receitas += valor
            if (t.status === 'liquidado') {
                acc.total_receitas_recebidas += valor
            }
        } else {
            acc.total_despesas += valor
            if (t.status === 'liquidado') {
                acc.total_despesas_pagas += valor
            } else {
                acc.total_despesas_pendentes += valor
            }
        }
        return acc
    }, {
        total_receitas: 0,
        total_receitas_recebidas: 0,
        total_despesas: 0,
        total_despesas_pagas: 0,
        total_despesas_pendentes: 0
    })

    return {
        ...stats,
        saldo_atual: stats.total_receitas_recebidas - stats.total_despesas_pagas
    }
}


export interface CashFlowData {
    name: string
    receitas: number
    despesas: number
}

/**
 * Busca dados de fluxo de caixa para o gráfico
 */
export async function getCashFlowData(year: number, numberOfMonths: number = 7, fullYear: boolean = false): Promise<CashFlowData[]> {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    let startDate: string;
    let endDate: string;
    let startMonth: number;
    let startYear: number;
    let actualNumberOfMonths: number;

    if (fullYear) {
        startMonth = 0; // Janeiro
        startYear = year;
        actualNumberOfMonths = 12;
        startDate = formatDateToISO(new Date(year, 0, 1))
        endDate = formatDateToISO(new Date(year, 11, 31))
    } else {
        const currentDate = new Date()
        const endMonth = currentDate.getMonth()
        const endYear = currentDate.getFullYear()

        startMonth = endMonth - numberOfMonths + 1
        startYear = endYear
        actualNumberOfMonths = numberOfMonths

        if (startMonth < 0) {
            startMonth += 12
            startYear -= 1
        }
        startDate = formatDateToISO(new Date(startYear, startMonth, 1))
        endDate = formatDateToISO(new Date(endYear, endMonth + 1, 0))
    }

    const { data: transactions, error } = await supabase
        .from('transacoes')
        .select('valor, tipo_transacao, data_vencimento')
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)

    if (error) throw error

    // Agrupar transações por mês
    const monthlyData: Record<string, { receitas: number; despesas: number }> = {}

    // Inicializar todos os meses do intervalo
    for (let i = 0; i < actualNumberOfMonths; i++) {
        let month = startMonth + i
        let adjustedYear = startYear

        if (month > 11) {
            month -= 12
            adjustedYear += 1
        }

        const key = `${adjustedYear}-${month.toString().padStart(2, '0')}`
        monthlyData[key] = { receitas: 0, despesas: 0 }
    }

    (transactions || []).forEach((t: any) => {
        const date = parseLocalDate(t.data_vencimento)
        const key = `${date.getFullYear()}-${date.getMonth().toString().padStart(2, '0')}`

        if (monthlyData[key]) {
            if (t.tipo_transacao === 'receita') {
                monthlyData[key].receitas += Number(t.valor)
            } else {
                monthlyData[key].despesas += Number(t.valor)
            }
        }
    })

    // Converter para array ordenado
    const result: CashFlowData[] = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => {
            const [, monthStr] = key.split('-')
            const monthIndex = parseInt(monthStr, 10)
            return {
                name: monthNames[monthIndex],
                receitas: data.receitas,
                despesas: data.despesas
            }
        })

    return result
}
