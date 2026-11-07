import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/utils'
import { useTransactionContextOptional } from '@/features/transactions/context/transaction-context'
import { type BudgetProgress, fetchBudgetProgress } from '../services/budgets'

/** Progresso dos orçamentos no mês. Refaz a busca quando transações mudam. */
export function useBudgetProgress(month: number, year: number) {
    const [progress, setProgress] = useState<BudgetProgress[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const updateCounter = useTransactionContextOptional()?.updateCounter ?? 0
    const [reloadKey, setReloadKey] = useState(0)

    const refresh = useCallback(() => setReloadKey(k => k + 1), [])

    useEffect(() => {
        let active = true
        const load = async () => {
            try {
                setLoading(true)
                const data = await fetchBudgetProgress(createClient(), month, year)
                if (!active) return
                setProgress(data)
                setError(null)
            } catch (err) {
                console.error('Erro ao carregar orçamentos:', err)
                if (active) setError(getErrorMessage(err, 'Erro ao carregar orçamentos'))
            } finally {
                if (active) setLoading(false)
            }
        }
        load()
        return () => { active = false }
    }, [month, year, updateCounter, reloadKey])

    return { progress, loading, error, refresh }
}
