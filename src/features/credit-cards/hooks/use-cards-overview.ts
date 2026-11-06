"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { type CardsOverview, fetchCardsOverview } from "../services/invoices"

const supabase = createClient()
const EMPTY: CardsOverview = { cards: [], invoices: [] }

/** Cartões com faturas e limite; recarrega quando transações mudam em qualquer tela. */
export function useCardsOverview() {
    const [data, setData] = useState<CardsOverview>(EMPTY)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const updateCounter = useTransactionContextOptional()?.updateCounter ?? 0

    useEffect(() => {
        let cancelled = false
        fetchCardsOverview(supabase)
            .then(result => {
                if (cancelled) return
                setData(result)
                setError(null)
            })
            .catch(err => {
                console.error(err)
                if (!cancelled) setError("Não foi possível carregar os cartões")
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [updateCounter, reloadKey])

    const refresh = useCallback(() => setReloadKey(k => k + 1), [])

    return { ...data, loading, error, refresh }
}
