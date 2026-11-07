import { ToneBadge, type Tone } from "@/components/ds"
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "../services/invoices"

const STATUS_TONE: Record<InvoiceStatus, Tone> = {
    aberta: "info",
    futura: "neutral",
    fechada: "warning",
    vencida: "danger",
    paga: "success",
}

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
    return <ToneBadge tone={STATUS_TONE[status]} className={className}>{INVOICE_STATUS_LABEL[status]}</ToneBadge>
}
