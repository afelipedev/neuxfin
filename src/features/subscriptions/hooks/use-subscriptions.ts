import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
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
        } catch (e: any) {
            setError(e)
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

    const create = useCallback(async (
        subscription: Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao'>
    ) => {
        try {
            setLoading(true)
            await createSubscription(subscription)
            toast.success('Assinatura criada com sucesso!')
            return true
        } catch (e: any) {
            console.error('Erro ao criar assinatura:', e)
            toast.error(`Erro ao criar assinatura: ${e.message || 'Erro desconhecido'}`)
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const update = useCallback(async (
        id: string,
        updates: Partial<Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao'>>
    ) => {
        try {
            setLoading(true)
            await updateSubscription(id, updates)
            toast.success('Assinatura atualizada com sucesso!')
            return true
        } catch (e: any) {
            console.error('Erro ao atualizar assinatura:', e)
            toast.error('Erro ao atualizar assinatura')
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const remove = useCallback(async (id: string) => {
        try {
            setLoading(true)
            await deleteSubscription(id)
            toast.success('Assinatura excluída com sucesso!')
            return true
        } catch (e: any) {
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
                toast.success(`${count} despesas geradas a partir das assinaturas!`)
            } else {
                toast.info('Todas as despesas de assinaturas já foram geradas para este mês.')
            }
            return count
        } catch (e: any) {
            console.error('Erro ao gerar despesas:', e)
            toast.error('Erro ao gerar despesas das assinaturas')
            return 0
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        create,
        update,
        remove,
        generateExpenses,
        loading
    }
}
