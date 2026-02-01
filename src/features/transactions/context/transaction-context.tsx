"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"

interface TransactionContextType {
    /** Contador global que incrementa sempre que uma transação é alterada */
    updateCounter: number
    /** Função para notificar que houve uma alteração nas transações */
    notifyTransactionChange: () => void
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined)

export function TransactionProvider({ children }: { children: React.ReactNode }) {
    const [updateCounter, setUpdateCounter] = useState(0)

    const notifyTransactionChange = useCallback(() => {
        setUpdateCounter(prev => prev + 1)
    }, [])

    return (
        <TransactionContext.Provider value={{ updateCounter, notifyTransactionChange }}>
            {children}
        </TransactionContext.Provider>
    )
}

export function useTransactionContext() {
    const context = useContext(TransactionContext)
    if (context === undefined) {
        throw new Error("useTransactionContext deve ser usado dentro de um TransactionProvider")
    }
    return context
}

/**
 * Hook opcional que retorna undefined se o contexto não existir
 * Útil para componentes que podem ou não estar dentro do provider
 */
export function useTransactionContextOptional() {
    return useContext(TransactionContext)
}
