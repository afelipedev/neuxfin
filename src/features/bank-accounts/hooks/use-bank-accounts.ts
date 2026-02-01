import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BankAccount } from '@/features/settings/services/settings-service'
import { useTransactionContextOptional } from '@/features/transactions/context/transaction-context'

export interface BankAccountWithBalance extends BankAccount {
    saldo_atual: number
}

export function useBankAccounts() {
    const [accounts, setAccounts] = useState<BankAccountWithBalance[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Usar o contexto global para detectar mudanças nas transações
    const transactionContext = useTransactionContextOptional()
    const globalUpdateCounter = transactionContext?.updateCounter ?? 0

    const loadAccounts = useCallback(async () => {
        try {
            setLoading(true)
            const supabase = createClient()

            // Buscar contas bancárias
            const { data: accountsData, error: accountsError } = await supabase
                .from('contas_bancarias')
                .select('*')
                .order('nome')

            if (accountsError) throw accountsError

            if (!accountsData) {
                setAccounts([])
                return
            }

            // Para cada conta, calcular o saldo atual
            const accountsWithBalance = await Promise.all(
                accountsData.map(async (account) => {
                    const saldoAtual = await calculateAccountBalance(account.id, account.saldo_inicial)
                    return {
                        ...account,
                        saldo_atual: saldoAtual
                    }
                })
            )

            setAccounts(accountsWithBalance)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar contas')
            console.error('Erro ao carregar contas:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    // Recarregar quando o contador global mudar (quando transações são alteradas)
    useEffect(() => {
        loadAccounts()
    }, [loadAccounts, globalUpdateCounter])

    async function calculateAccountBalance(accountId: string, saldoInicial: number): Promise<number> {
        try {
            const supabase = createClient()

            // Buscar todas as transações liquidadas desta conta
            const { data: transactions, error } = await supabase
                .from('transacoes')
                .select('tipo_transacao, valor, status')
                .eq('conta_id', accountId)
                .eq('status', 'liquidado')

            if (error) throw error

            if (!transactions || transactions.length === 0) {
                return saldoInicial
            }

            // Calcular saldo: saldo_inicial + receitas - despesas
            const saldo = transactions.reduce((acc, transaction) => {
                if (transaction.tipo_transacao === 'receita') {
                    return acc + transaction.valor
                } else {
                    return acc - transaction.valor
                }
            }, saldoInicial)

            return saldo
        } catch (err) {
            console.error('Erro ao calcular saldo da conta:', err)
            return saldoInicial
        }
    }

    return {
        accounts,
        loading,
        error,
        refresh: loadAccounts,
        calculateAccountBalance
    }
}
