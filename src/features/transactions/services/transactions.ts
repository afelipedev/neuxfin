import { createClient } from '@/lib/supabase/client'
import { parseLocalDate, formatDateToISO, dateInMonthClamped } from '@/lib/utils'
import {
    BalanceTx,
    computeProjectedBalance,
    countLiquidatedWithoutAccount,
    deriveStatus,
    fetchBalanceOverview,
    fromCents,
    toCents,
    todayISO
} from '@/features/bank-accounts/services/balances'

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

    // "atrasado" é derivado: em aberto com vencimento anterior a hoje
    if (status === 'liquidado') {
        query = query.eq('status', 'liquidado')
    } else if (status === 'pendente') {
        query = query.neq('status', 'liquidado').gte('data_vencimento', todayISO())
    } else if (status === 'atrasado') {
        query = query.neq('status', 'liquidado').lt('data_vencimento', todayISO())
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
        .select('valor, status, data_vencimento')
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

    const today = todayISO()
    const stats = ((transactions || []) as Pick<BalanceTx, 'valor' | 'status' | 'data_vencimento'>[]).reduce((acc: TransactionStats, t) => {
        const valor = Number(t.valor)
        acc.total += valor

        switch (deriveStatus(t, today)) {
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

            // Mantém o dia, limitado ao último dia do mês alvo (31 → 28/29/30)
            const novaData = dateInMonthClamped(targetDate.year, targetDate.month - 1, dia)

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
    dataPagamento?: string,
    contaId?: string | null
) {
    return updateTransaction(id, buildStatusUpdate(status, dataPagamento, contaId))
}

/**
 * Mantém status e data_pagamento coerentes:
 * liquidado ⇒ data_pagamento preenchida (padrão: hoje); demais ⇒ data_pagamento nula.
 */
export function buildStatusUpdate(
    status: Transaction['status'],
    dataPagamento?: string | null,
    contaId?: string | null
): Partial<Transaction> {
    const updates: Partial<Transaction> = {
        status,
        data_pagamento: status === 'liquidado' ? (dataPagamento || todayISO()) : null
    }
    if (contaId !== undefined) updates.conta_id = contaId
    return updates
}

export interface DashboardStats {
    // Mês selecionado (competência: data_vencimento)
    total_receitas: number
    total_receitas_recebidas: number
    total_despesas: number
    total_despesas_pagas: number
    total_despesas_pendentes: number
    total_despesas_atrasadas: number
    resultado_mes: number
    // Saldos (independentes do mês navegado)
    saldo_atual: number
    saldo_previsto: number
    receitas_a_receber: number
    despesas_a_pagar: number
    transacoes_pagas_sem_conta: number
}

export const EMPTY_DASHBOARD_STATS: DashboardStats = {
    total_receitas: 0,
    total_receitas_recebidas: 0,
    total_despesas: 0,
    total_despesas_pagas: 0,
    total_despesas_pendentes: 0,
    total_despesas_atrasadas: 0,
    resultado_mes: 0,
    saldo_atual: 0,
    saldo_previsto: 0,
    receitas_a_receber: 0,
    despesas_a_pagar: 0,
    transacoes_pagas_sem_conta: 0
}

/**
 * Busca estatísticas do dashboard.
 * - Totais do mês por data_vencimento (competência).
 * - saldo_atual = Saldo Disponível hoje (soma das contas), igual em qualquer mês navegado.
 * - saldo_previsto = saldo_atual + lançamentos em aberto (com conta) até o fim do mês selecionado.
 * Regras de saldo centralizadas em features/bank-accounts/services/balances.ts.
 */
export async function getDashboardStats(filters: { month?: number, year?: number } = {}): Promise<DashboardStats> {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = filters

    const startDate = formatDateToISO(new Date(year, month - 1, 1))
    const endDate = formatDateToISO(new Date(year, month, 0))
    const today = todayISO()

    type DashboardTxRow = Pick<BalanceTx, 'valor' | 'tipo_transacao' | 'status' | 'data_vencimento'>

    const [monthResult, overview, semConta] = await Promise.all([
        supabase
            .from('transacoes')
            .select('valor, tipo_transacao, status, data_vencimento')
            .gte('data_vencimento', startDate)
            .lte('data_vencimento', endDate),
        fetchBalanceOverview(supabase),
        countLiquidatedWithoutAccount(supabase)
    ])

    if (monthResult.error) throw monthResult.error

    const c = {
        receitas: 0, recebidas: 0,
        despesas: 0, pagas: 0, pendentes: 0, atrasadas: 0
    }

    for (const t of (monthResult.data || []) as DashboardTxRow[]) {
        const cents = toCents(t.valor)
        const status = deriveStatus(t, today)
        if (t.tipo_transacao === 'receita') {
            c.receitas += cents
            if (status === 'liquidado') c.recebidas += cents
        } else {
            c.despesas += cents
            if (status === 'liquidado') c.pagas += cents
            else {
                c.pendentes += cents
                if (status === 'atrasado') c.atrasadas += cents
            }
        }
    }

    const projection = computeProjectedBalance(overview.saldo_disponivel, overview.transactions, endDate)

    return {
        total_receitas: fromCents(c.receitas),
        total_receitas_recebidas: fromCents(c.recebidas),
        total_despesas: fromCents(c.despesas),
        total_despesas_pagas: fromCents(c.pagas),
        total_despesas_pendentes: fromCents(c.pendentes),
        total_despesas_atrasadas: fromCents(c.atrasadas),
        resultado_mes: fromCents(c.receitas - c.despesas),
        saldo_atual: overview.saldo_disponivel,
        saldo_previsto: projection.saldo_previsto,
        receitas_a_receber: projection.receitas_a_receber,
        despesas_a_pagar: projection.despesas_a_pagar,
        transacoes_pagas_sem_conta: semConta
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
