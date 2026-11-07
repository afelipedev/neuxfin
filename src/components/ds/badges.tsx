import * as React from "react"
import { cn } from "@/lib/utils"
import { TONE, type Tone } from "./tone"

/** Badge base do design system (fundo suave na cor do tom). */
export function ToneBadge({ tone = "neutral", className, children, ...props }: React.ComponentProps<"span"> & { tone?: Tone }) {
    return (
        <span
            className={cn(
                "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-2xs font-semibold [&>svg]:size-3",
                TONE[tone].soft,
                className
            )}
            {...props}
        >
            {children}
        </span>
    )
}

type TxStatus = "liquidado" | "pendente" | "atrasado"

const TX_STATUS: Record<TxStatus, { tone: Tone; despesa: string; receita: string }> = {
    liquidado: { tone: "success", despesa: "Pago", receita: "Recebido" },
    pendente: { tone: "warning", despesa: "Pendente", receita: "A receber" },
    atrasado: { tone: "danger", despesa: "Atrasado", receita: "Atrasado" },
}

/** Status de transação. Passe o status já derivado (`deriveStatus`). */
export function TransactionStatusBadge({ status, kind = "despesa", className }: { status: TxStatus; kind?: "receita" | "despesa"; className?: string }) {
    const cfg = TX_STATUS[status] ?? TX_STATUS.pendente
    return <ToneBadge tone={cfg.tone} className={className}>{cfg[kind]}</ToneBadge>
}

/** Perfil PF (secundária) ou PJ (terciária). */
export function ProfileBadge({ tipo, className }: { tipo: "PF" | "PJ" | string; className?: string }) {
    return (
        <ToneBadge tone={tipo === "PJ" ? "tertiary" : "secondary"} className={className}>
            {tipo}
        </ToneBadge>
    )
}
