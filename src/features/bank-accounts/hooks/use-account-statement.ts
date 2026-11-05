import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateToISO } from '@/lib/utils'
import { BankAccount } from '@/features/settings/services/settings-service'
import { useTransactionContextOptional } from '@/features/transactions/context/transaction-context'
import {
    StatementTx,
    buildStatement,
    computeAccountBalance,
    deriveStatus,
    fetchStatementTransactions,
    todayISO
} from '../services/balances'

/**
 * Extrato de uma conta no mês: lançamentos liquidados com saldo corrido,
 * saldo atual (hoje) e lançamentos em aberto com vencimento no mês.
 */
export function useAccountStatement(accountId: string, month: number, year: number) {
    const [account, setAccount] = useState<BankAccount | null>(null)
    const [transactions, setTransactions] = useState<StatementTx[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const supabase = createClient()
            const [accountResult, txs] = await Promise.all([
                supabase.from('contas_bancarias').select('*').eq('id', accountId).maybeSingle(),
                fetchStatementTransactions(supabase, accountId)
            ])
            if (accountResult.error) throw accountResult.error
            setAccount(accountResult.data as BankAccount | null)
            setTransactions(txs)
            setError(null)
        } catch (err) {
            console.error('Erro ao carregar extrato:', err)
            setError(err instanceof Error ? err.message : 'Erro ao carregar extrato')
        } finally {
            setLoading(false)
        }
    }, [accountId])

    useEffect(() => {
        load()
    }, [load, globalUpdateCounter])

    const derived = useMemo(() => {
        const from = formatDateToISO(new Date(year, month - 1, 1))
        const to = formatDateToISO(new Date(year, month, 0))
        const saldoInicial = account?.saldo_inicial ?? 0
        const today = todayISO()

        const statement = buildStatement(saldoInicial, transactions, from, to)
        const saldoAtual = computeAccountBalance(saldoInicial, transactions, today)
        const emAberto = transactions
            .filter(tx => tx.status !== 'liquidado' && tx.data_vencimento.slice(0, 10) <= to
                && (tx.data_vencimento.slice(0, 10) >= from || deriveStatus(tx, today) === 'atrasado'))
            .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))

        return { statement, saldoAtual, emAberto }
    }, [account, transactions, month, year])

    return { account, loading, error, refresh: load, ...derived }
}
