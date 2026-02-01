import { useState, useEffect, useCallback } from 'react'
import {
    getTransactions,
    getTransactionStats,
    getDashboardStats,
    getCashFlowData,
    Transaction,
    TransactionStats,
    TransactionFilters,
    CashFlowData,
    createTransaction,
    createParceledTransaction,
    updateTransaction,
    deleteTransaction,
    deleteAllInstallments,
    updateTransactionStatus,
    replicateTransactions
} from '../services/transactions'
import { toast } from 'sonner'
import { useTransactionContextOptional } from '../context/transaction-context'

export function useTransactions(filters: TransactionFilters = {}) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Usar o contexto global para detectar mudanças em outras telas
    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true)
            const result = await getTransactions(filters)
            setTransactions(result.data || [])
            setTotalCount(result.count || 0)
            setError(null)
        } catch (e: any) {
            setError(e)
            toast.error('Erro ao carregar transações')
        } finally {
            setLoading(false)
        }
    }, [
        filters.month,
        filters.year,
        filters.tipo,
        filters.tipo_transacao,
        filters.status,
        filters.categoria_id,
        filters.page,
        filters.pageSize,
        filters.sortBy,
        filters.sortOrder
    ])

    // Recarregar quando os filtros ou o contador global mudarem
    useEffect(() => {
        loadTransactions()
    }, [loadTransactions, globalUpdateCounter])

    const refresh = useCallback(() => {
        loadTransactions()
    }, [loadTransactions])

    return { transactions, totalCount, loading, error, refresh }
}

export function useTransactionStats(filters: TransactionFilters = {}) {
    const [stats, setStats] = useState<TransactionStats>({
        total: 0,
        liquidado: 0,
        pendente: 0,
        atrasado: 0
    })
    const [loading, setLoading] = useState(true)

    // Usar o contexto global para detectar mudanças em outras telas
    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true)
                const data = await getTransactionStats(filters)
                setStats(data)
            } catch (e) {
                console.error(e)
                toast.error('Erro ao carregar estatísticas')
            } finally {
                setLoading(false)
            }
        }

        loadStats()
    }, [filters.month, filters.year, filters.tipo, filters.tipo_transacao, globalUpdateCounter])

    return { stats, loading }
}

export function useDashboardStats(filters: { month?: number, year?: number } = {}) {
    const [stats, setStats] = useState({
        total_receitas: 0,
        total_receitas_recebidas: 0,
        total_despesas: 0,
        total_despesas_pagas: 0,
        total_despesas_pendentes: 0,
        saldo_atual: 0
    })
    const [loading, setLoading] = useState(true)

    // Usar o contexto global para detectar mudanças em outras telas
    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true)
                const data = await getDashboardStats(filters)
                setStats(data)
            } catch (e) {
                console.error(e)
                toast.error('Erro ao carregar estatísticas do dashboard')
            } finally {
                setLoading(false)
            }
        }

        loadStats()
    }, [filters.month, filters.year, globalUpdateCounter])

    return { stats, loading }
}

export function useCashFlowData(numberOfMonths: number = 7, fullYear: boolean = false) {
    const [data, setData] = useState<CashFlowData[]>([])
    const [loading, setLoading] = useState(true)

    // Usar o contexto global para detectar mudanças em outras telas
    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                const year = new Date().getFullYear()
                const cashFlowData = await getCashFlowData(year, numberOfMonths, fullYear)
                setData(cashFlowData)
            } catch (e) {
                console.error(e)
                toast.error('Erro ao carregar fluxo de caixa')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [numberOfMonths, fullYear, globalUpdateCounter])

    return { data, loading }
}

export function useTransactionActions() {
    const [loading, setLoading] = useState(false)

    // Usar o contexto global para notificar mudanças
    const transactionContext = useTransactionContextOptional()
    const notifyChange = transactionContext?.notifyTransactionChange

    const create = useCallback(async (
        transaction: Omit<Transaction, 'id' | 'created_at'>,
        parcelas?: number
    ) => {
        try {
            setLoading(true)

            if (parcelas && parcelas > 1) {
                await createParceledTransaction(transaction, parcelas)
                toast.success(`Transação parcelada criada com sucesso! (${parcelas}x)`)
            } else {
                await createTransaction(transaction)
                toast.success('Transação criada com sucesso!')
            }

            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e: any) {
            console.error('Erro detalhado ao criar transação:', JSON.stringify(e, null, 2))
            console.error('Mensagem de erro:', e.message)
            console.error('Detalhes do erro:', e.details)
            console.error('Hint do erro:', e.hint)
            toast.error(`Erro ao criar transação: ${e.message || 'Erro desconhecido'}`)
            return false
        } finally {
            setLoading(false)
        }
    }, [notifyChange])

    const update = useCallback(async (id: string, updates: Partial<Transaction>) => {
        try {
            setLoading(true)
            await updateTransaction(id, updates)
            toast.success('Transação atualizada com sucesso!')
            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao atualizar transação')
            return false
        } finally {
            setLoading(false)
        }
    }, [notifyChange])

    const remove = useCallback(async (id: string, deleteAll: boolean = false) => {
        try {
            setLoading(true)

            if (deleteAll) {
                await deleteAllInstallments(id)
                toast.success('Todas as parcelas foram excluídas!')
            } else {
                await deleteTransaction(id)
                toast.success('Transação excluída com sucesso!')
            }

            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao excluir transação')
            return false
        } finally {
            setLoading(false)
        }
    }, [notifyChange])

    const updateStatus = useCallback(async (
        id: string,
        status: 'liquidado' | 'pendente' | 'atrasado',
        dataPagamento?: string
    ) => {
        try {
            setLoading(true)
            await updateTransactionStatus(id, status, dataPagamento)

            const statusText = {
                liquidado: 'liquidada',
                pendente: 'marcada como pendente',
                atrasado: 'marcada como atrasada'
            }

            toast.success(`Transação ${statusText[status]}!`)
            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao atualizar status')
            return false
        } finally {
            setLoading(false)
        }
    }, [notifyChange])

    const replicate = useCallback(async (
        transactionIds: string[],
        targetMonths: { month: number, year: number }[]
    ) => {
        try {
            setLoading(true)
            const result = await replicateTransactions(transactionIds, targetMonths)
            toast.success(`${result.length} transações replicadas com sucesso!`)
            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao replicar transações')
            return false
        } finally {
            setLoading(false)
        }
    }, [notifyChange])

    return {
        create,
        update,
        remove,
        updateStatus,
        replicate,
        loading
    }
}
