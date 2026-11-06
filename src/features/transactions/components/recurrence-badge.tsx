import { Repeat } from "lucide-react"
import type { Transaction } from "../services/transactions"

/** Marca lançamentos de série recorrente ou gerados por assinatura. */
export function RecurrenceBadge({ transaction }: { transaction: Pick<Transaction, "recorrencia_id" | "assinatura_id"> }) {
    if (!transaction.recorrencia_id && !transaction.assinatura_id) return null
    const label = transaction.assinatura_id ? "Assinatura" : "Recorrente"
    return (
        <span
            className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"
            title={transaction.assinatura_id ? "Gerada automaticamente pela assinatura" : "Faz parte de uma série mensal"}
        >
            <Repeat className="h-3 w-3" aria-hidden="true" />
            {label}
        </span>
    )
}
