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
    DashboardStats,
    EMPTY_DASHBOARD_STATS,
    createTransaction,
    createParceledTransaction,
    createRecurringTransactions,
    deleteRecurrenceFrom,
    updateTransaction,
    deleteTransaction,
    deleteAllInstallments,
    updateTransactionStatus,
    replicateTransactions
} from '../services/transactions'
import { toast } from 'sonner'
import { useTransactionContextOptional } from '../context/transaction-context'
import { getErrorMessage, toError } from '@/lib/utils'

export function useTransactions(filters: TransactionFilters = {}) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Usar o contexto global para detectar mudanças em outras telas
    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    // Campos primitivos como dependências: recarrega só quando um filtro muda de valor
    const { month, year, tipo, tipo_transacao, status, categoria_id, page, pageSize, sortBy, sortOrder } = filters

    const loadTransactions = useCallback(async () => {
        try {
            setLoading(true)
            const result = await getTransactions({
                month, year, tipo, tipo_transacao, status, categoria_id, page, pageSize, sortBy, sortOrder,
            })
            setTransactions(result.data || [])
            setTotalCount(result.count || 0)
            setError(null)
        } catch (e) {
            setError(toError(e))
            toast.error('Erro ao carregar transações')
        } finally {
            setLoading(false)
        }
    }, [month, year, tipo, tipo_transacao, status, categoria_id, page, pageSize, sortBy, sortOrder])

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

    const { month, year, tipo, tipo_transacao } = filters

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true)
                const data = await getTransactionStats({ month, year, tipo, tipo_transacao })
                setStats(data)
            } catch (e) {
                console.error(e)
                toast.error('Erro ao carregar estatísticas')
            } finally {
                setLoading(false)
            }
        }

        loadStats()
    }, [month, year, tipo, tipo_transacao, globalUpdateCounter])

    return { stats, loading }
}

export function useDashboardStats(filters: { month?: number, year?: number } = {}) {
    const [stats, setStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS)
    const [loading, setLoading] = useState(true)

    // Usar o contexto global para detectar mudanças em outras telas
    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    const { month, year } = filters

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true)
                const data = await getDashboardStats({ month, year })
                setStats(data)
            } catch (e) {
                console.error(e)
                toast.error('Erro ao carregar estatísticas do dashboard')
            } finally {
                setLoading(false)
            }
        }

        loadStats()
    }, [month, year, globalUpdateCounter])

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
        parcelas?: number,
        /** Repetir mensalmente por N meses (série recorrente); exclusivo com parcelas */
        recorrenteMeses?: number
    ) => {
        try {
            setLoading(true)

            if (recorrenteMeses && recorrenteMeses > 1) {
                await createRecurringTransactions(transaction, recorrenteMeses)
                toast.success(`Lançamento recorrente criado para ${recorrenteMeses} meses!`)
            } else if (parcelas && parcelas > 1) {
                await createParceledTransaction(transaction, parcelas)
                toast.success(`Transação parcelada criada com sucesso! (${parcelas}x)`)
            } else {
                await createTransaction(transaction)
                toast.success('Transação criada com sucesso!')
            }

            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e) {
            console.error('Erro detalhado ao criar transação:', JSON.stringify(e, null, 2))
            const detail = e as { details?: string; hint?: string }
            console.error('Mensagem de erro:', getErrorMessage(e))
            console.error('Detalhes do erro:', detail?.details)
            console.error('Hint do erro:', detail?.hint)
            toast.error(`Erro ao criar transação: ${getErrorMessage(e)}`)
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
        } catch (e) {
            console.error(e)
            toast.error('Erro ao atualizar transação')
            return false
        } finally {
            setLoading(false)
        }
    }, [notifyChange])

    /**
     * Exclui a transação. `deleteAll` remove todas as parcelas; `recurrence` remove este
     * lançamento recorrente e os próximos da mesma série.
     */
    const remove = useCallback(async (
        id: string,
        deleteAll: boolean = false,
        recurrence?: { recorrenciaId: string; aPartirDe: string }
    ) => {
        try {
            setLoading(true)

            if (recurrence) {
                const n = await deleteRecurrenceFrom(recurrence.recorrenciaId, recurrence.aPartirDe)
                toast.success(n === 1 ? 'Lançamento excluído!' : `${n} lançamentos recorrentes excluídos!`)
            } else if (deleteAll) {
                await deleteAllInstallments(id)
                toast.success('Todas as parcelas foram excluídas!')
            } else {
                await deleteTransaction(id)
                toast.success('Transação excluída com sucesso!')
            }

            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e) {
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
        dataPagamento?: string,
        contaId?: string | null
    ) => {
        try {
            setLoading(true)
            await updateTransactionStatus(id, status, dataPagamento, contaId)

            const statusText = {
                liquidado: 'liquidada',
                pendente: 'marcada como pendente',
                atrasado: 'marcada como atrasada'
            }

            toast.success(`Transação ${statusText[status]}!`)
            // Notificar todas as telas sobre a mudança
            notifyChange?.()
            return true
        } catch (e) {
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
        } catch (e) {
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
