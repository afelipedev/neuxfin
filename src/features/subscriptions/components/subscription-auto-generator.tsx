"use client"

import * as React from "react"
import { toast } from "sonner"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { generateExpensesFromSubscriptions } from "../services/subscriptions"

/**
 * Lança automaticamente as despesas das assinaturas do mês atual ao abrir o app.
 * A geração é idempotente (índice único por assinatura e vencimento), então rodar
 * a cada carregamento do layout não duplica lançamentos.
 */
export function SubscriptionAutoGenerator() {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const ran = React.useRef(false)

    React.useEffect(() => {
        if (ran.current) return
        ran.current = true
        const now = new Date()
        generateExpensesFromSubscriptions(now.getMonth() + 1, now.getFullYear())
            .then(count => {
                if (count > 0) {
                    toast.info(`${count} ${count === 1 ? "despesa de assinatura lançada" : "despesas de assinaturas lançadas"} para este mês.`)
                    notify?.()
                }
            })
            .catch(error => console.error("[assinaturas] geração automática", error))
    }, [notify])

    return null
}
