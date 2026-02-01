import { useState, useEffect, useCallback } from 'react'
import {
    getCofrinhos,
    createCofrinho,
    updateCofrinho,
    deleteCofrinho,
    addCofrinhoTransaction,
    getCofrinhoTransactions,
    Cofrinho,
    CofrinhoTransaction
} from '../services/cofrinhos'
import { toast } from 'sonner'

export function useCofrinhos() {
    const [cofrinhos, setCofrinhos] = useState<Cofrinho[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadCofrinhos = useCallback(async () => {
        try {
            setLoading(true)
            const data = await getCofrinhos()
            setCofrinhos(data)
            setError(null)
        } catch (e: any) {
            setError(e)
            toast.error('Erro ao carregar cofrinhos')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadCofrinhos()
    }, [loadCofrinhos])

    const refresh = useCallback(() => {
        loadCofrinhos()
    }, [loadCofrinhos])

    return { cofrinhos, loading, error, refresh }
}

export function useCofrinhoTransactions(cofrinhoId?: string) {
    const [transactions, setTransactions] = useState<CofrinhoTransaction[]>([])
    const [loading, setLoading] = useState(false)

    const loadTransactions = useCallback(async () => {
        if (!cofrinhoId) return
        try {
            setLoading(true)
            const data = await getCofrinhoTransactions(cofrinhoId)
            setTransactions(data)
        } catch (e) {
            console.error(e)
            toast.error('Erro ao carregar movimentações')
        } finally {
            setLoading(false)
        }
    }, [cofrinhoId])

    useEffect(() => {
        loadTransactions()
    }, [loadTransactions])

    return { transactions, loading, refresh: loadTransactions }
}

export function useCofrinhoActions() {
    const [loading, setLoading] = useState(false)

    const create = useCallback(async (cofrinho: Omit<Cofrinho, 'id' | 'usuario_id' | 'saldo_atual' | 'created_at'>) => {
        try {
            setLoading(true)
            await createCofrinho(cofrinho)
            toast.success('Cofrinho criado com sucesso!')
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao criar cofrinho')
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const update = useCallback(async (id: string, updates: Partial<Cofrinho>) => {
        try {
            setLoading(true)
            await updateCofrinho(id, updates)
            toast.success('Cofrinho atualizado com sucesso!')
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao atualizar cofrinho')
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const remove = useCallback(async (id: string) => {
        try {
            setLoading(true)
            await deleteCofrinho(id)
            toast.success('Cofrinho excluído com sucesso!')
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao excluir cofrinho')
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const addTransaction = useCallback(async (transaction: Omit<CofrinhoTransaction, 'id' | 'created_at'>) => {
        try {
            setLoading(true)
            await addCofrinhoTransaction(transaction)
            toast.success(transaction.tipo === 'aporte' ? 'Aporte realizado!' : 'Resgate realizado!')
            return true
        } catch (e: any) {
            console.error(e)
            toast.error('Erro ao realizar movimentação')
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    return {
        create,
        update,
        remove,
        addTransaction,
        loading
    }
}
