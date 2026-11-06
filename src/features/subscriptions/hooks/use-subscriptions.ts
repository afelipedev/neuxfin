import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getErrorMessage, toError } from '@/lib/utils'
import {
    getSubscriptions,
    getSubscriptionStats,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    generateExpensesFromSubscriptions,
    Subscription,
    SubscriptionStats
} from '../services/subscriptions'
import { useTransactionContextOptional } from '@/features/transactions/context/transaction-context'

/** Lança a despesa do mês atual logo após criar/editar (idempotente). */
async function syncCurrentMonth(): Promise<number> {
    const now = new Date()
    try {
        return await generateExpensesFromSubscriptions(now.getMonth() + 1, now.getFullYear())
    } catch (e) {
        console.error('Erro ao lançar despesas das assinaturas:', e)
        return 0
    }
}

/**
 * Hook para gerenciar lista de assinaturas
 */
export function useSubscriptions() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadSubscriptions = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getSubscriptions()
            setSubscriptions(data)
            setError(null)
        } catch (e) {
            setError(toError(e))
            toast.error('Erro ao carregar assinaturas')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSubscriptions()
    }, [loadSubscriptions])

    const refresh = useCallback(() => {
        loadSubscriptions()
    }, [loadSubscriptions])

    return { subscriptions, loading, error, refresh }
}

/**
 * Hook para estatísticas de assinaturas
 */
export function useSubscriptionStats() {
    const [stats, setStats] = useState<SubscriptionStats>({
        custoMensal: 0,
        totalAtivas: 0,
        totalPausadas: 0,
        totalCanceladas: 0
    })
    const [loading, setLoading] = useState(true)

    const loadStats = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getSubscriptionStats()
            setStats(data)
        } catch (e) {
            console.error(e)
            toast.error('Erro ao carregar estatísticas')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    return { stats, loading, refresh: loadStats }
}

/**
 * Hook para ações CRUD de assinaturas
 */
export function useSubscriptionActions() {
    const [loading, setLoading] = useState(false)
    const notify = useTransactionContextOptional()?.notifyTransactionChange

    const create = useCallback(async (
        subscription: Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao' | 'conta'>
    ) => {
        try {
            setLoading(true)
            await createSubscription(subscription)
            const lancadas = await syncCurrentMonth()
            toast.success('Assinatura criada com sucesso!', {
                description: lancadas > 0 ? 'A despesa deste mês já foi lançada.' : undefined,
            })
            if (lancadas > 0) notify?.()
            return true
        } catch (e) {
            console.error('Erro ao criar assinatura:', e)
            toast.error(`Erro ao criar assinatura: ${getErrorMessage(e)}`)
            return false
        } finally {
            setLoading(false)
        }
    }, [notify])

    const update = useCallback(async (
        id: string,
        updates: Partial<Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao' | 'conta'>>
    ) => {
        try {
            setLoading(true)
            await updateSubscription(id, updates)
            if ((await syncCurrentMonth()) > 0) notify?.()
            toast.success('Assinatura atualizada com sucesso!')
            return true
        } catch (e) {
            console.error('Erro ao atualizar assinatura:', e)
            toast.error(`Erro ao atualizar assinatura: ${getErrorMessage(e)}`)
            return false
        } finally {
            setLoading(false)
        }
    }, [notify])

    const remove = useCallback(async (id: string) => {
        try {
            setLoading(true)
            await deleteSubscription(id)
            toast.success('Assinatura excluída com sucesso!')
            return true
        } catch (e) {
            console.error('Erro ao excluir assinatura:', e)
            toast.error('Erro ao excluir assinatura')
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const generateExpenses = useCallback(async (month: number, year: number) => {
        try {
            setLoading(true)
            const count = await generateExpensesFromSubscriptions(month, year)
            if (count > 0) {
                notify?.()
                toast.success(`${count} despesas geradas a partir das assinaturas!`)
            } else {
                toast.info('Todas as despesas de assinaturas já foram geradas para este mês.')
            }
            return count
        } catch (e) {
            console.error('Erro ao gerar despesas:', e)
            toast.error('Erro ao gerar despesas das assinaturas')
            return 0
        } finally {
            setLoading(false)
        }
    }, [notify])

    return {
        create,
        update,
        remove,
        generateExpenses,
        loading
    }
}
