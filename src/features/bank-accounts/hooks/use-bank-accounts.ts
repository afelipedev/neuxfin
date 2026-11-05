import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BankAccount } from '@/features/settings/services/settings-service'
import { useTransactionContextOptional } from '@/features/transactions/context/transaction-context'
import { fetchBalanceOverview } from '../services/balances'

export interface BankAccountWithBalance extends BankAccount {
    saldo_atual: number
}

/**
 * Contas bancárias com saldo atual (hoje), calculado por `balances.ts`.
 * Recarrega quando qualquer transação é alterada (TransactionContext).
 */
export function useBankAccounts() {
    const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([])
    const [totalBalance, setTotalBalance] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    const loadAccounts = useCallback(async () => {
        try {
            setLoading(true)
            const overview = await fetchBalanceOverview<BankAccount>(createClient())
            setAccounts(overview.accounts)
            setTotalBalance(overview.saldo_disponivel)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar contas')
            console.error('Erro ao carregar contas:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadAccounts()
    }, [loadAccounts, globalUpdateCounter])

    return {
        accounts,
        totalBalance,
        loading,
        error,
        refresh: loadAccounts
    }
}
