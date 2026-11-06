"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { fetchReport, type ReportData } from "../services/reports"

const supabase = createClient()

export function useReport(months: number) {
    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const updateCounter = useTransactionContextOptional()?.updateCounter ?? 0

    useEffect(() => {
        let cancelled = false
        fetchReport(supabase, months)
            .then(result => {
                if (cancelled) return
                setData(result)
                setError(null)
            })
            .catch(err => {
                console.error(err)
                if (!cancelled) setError("Não foi possível carregar o relatório")
            })
            .finally(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [months, updateCounter])

    return { data, loading, error }
}

export interface Insight {
    tipo: "positivo" | "atencao" | "dica"
    titulo: string
    descricao: string
}

/** Análise por IA sob demanda (botão), via /api/insights. */
export function useInsights() {
    const [insights, setInsights] = useState<Insight[] | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const generate = async (months: number) => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch("/api/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ months }),
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body?.error ?? "Erro ao gerar análise")
            setInsights(body.insights as Insight[])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao gerar análise")
        } finally {
            setLoading(false)
        }
    }

    return { insights, loading, error, generate }
}
