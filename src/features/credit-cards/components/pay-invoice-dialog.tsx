"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, parseLocalDate } from "@/lib/utils"
import { type BankAccount, settingsService } from "@/features/settings/services/settings-service"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { todayISO } from "@/features/bank-accounts/services/balances"
import { type Invoice, payInvoice } from "../services/invoices"

const supabase = createClient()

interface PayInvoiceDialogProps {
    cardName: string
    invoice: Invoice
    onSuccess?: () => void
}

/** Paga a fatura inteira (compras em aberto) debitando uma conta. */
export function PayInvoiceDialog({ cardName, invoice, onSuccess }: PayInvoiceDialogProps) {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [contaId, setContaId] = useState("")
    const [data, setData] = useState(todayISO())

    const openIds = invoice.compras.filter(c => c.status !== "liquidado").map(c => c.id)
    const competencia = format(parseLocalDate(`${invoice.key}-01`), "MMMM 'de' yyyy", { locale: ptBR })

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) return
        setData(todayISO())
        settingsService.getBankAccounts()
            .then(list => {
                setAccounts(list)
                setContaId((list.find(a => a.padrao) ?? list[0])?.id ?? "")
            })
            .catch(console.error)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSaving(true)
            await payInvoice(supabase, {
                cartaoId: invoice.cartao_id,
                invoiceKey: invoice.key,
                contaId,
                dataPagamento: data,
                transacaoIds: openIds,
            })
            toast.success("Fatura paga!", { description: `${formatCurrency(invoice.em_aberto)} debitados da conta.` })
            notify?.()
            onSuccess?.()
            setOpen(false)
        } catch (err) {
            console.error(err)
            toast.error(err instanceof Error ? err.message : "Erro ao pagar a fatura")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={openIds.length === 0} className="bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold">
                    Pagar fatura
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Pagar fatura {cardName}</DialogTitle>
                    <DialogDescription>
                        Fatura de {competencia}, vencimento em {format(parseLocalDate(invoice.vencimento), "dd/MM/yyyy")}.
                        O valor sai da conta escolhida; as compras ficam marcadas como pagas.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-xl bg-secondary/50 p-4 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Valor a pagar</span>
                        <span className="text-xl font-black tabular-nums">{formatCurrency(invoice.em_aberto)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fatura-conta">Pagar com a conta</Label>
                            <Select value={contaId} onValueChange={setContaId}>
                                <SelectTrigger id="fatura-conta"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fatura-data">Data do pagamento</Label>
                            <Input id="fatura-data" type="date" value={data} onChange={e => setData(e.target.value)} required />
                        </div>
                    </div>
                    {accounts.length === 0 && (
                        <p className="text-xs text-muted-foreground">Cadastre uma conta bancária em Configurações para pagar a fatura.</p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button type="submit" disabled={saving || !contaId || !data}>
                            {saving ? "Pagando..." : "Confirmar pagamento"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
