import { cn } from "@/lib/utils"
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "../services/invoices"

const STATUS_TONE: Record<InvoiceStatus, string> = {
    aberta: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    futura: "bg-secondary text-muted-foreground",
    fechada: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    vencida: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    paga: "bg-brand-1/10 text-brand-1",
}

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
    return (
        <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide", STATUS_TONE[status], className)}>
            {INVOICE_STATUS_LABEL[status]}
        </span>
    )
}
