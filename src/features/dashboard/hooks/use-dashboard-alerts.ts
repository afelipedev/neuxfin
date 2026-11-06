"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { type DashboardAlerts, getDashboardAlerts } from "../services/dashboard-alerts"

const supabase = createClient()
const EMPTY: DashboardAlerts = { upcoming: [], alerts: [], reserva_meses: null }

/** Vencimentos e alertas; recarrega quando transações mudam em qualquer tela. */
export function useDashboardAlerts(saldoPrevistoFimMes?: number) {
    const [data, setData] = useState<DashboardAlerts>(EMPTY)
    const [loading, setLoading] = useState(true)
    const updateCounter = useTransactionContextOptional()?.updateCounter ?? 0

    useEffect(() => {
        let cancelled = false
        getDashboardAlerts(supabase, { saldoPrevistoFimMes })
            .then(result => { if (!cancelled) setData(result) })
            .catch(console.error)
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [saldoPrevistoFimMes, updateCounter])

    return { ...data, loading }
}
