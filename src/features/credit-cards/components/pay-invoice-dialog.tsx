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
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, getErrorMessage, parseLocalDate } from "@/lib/utils"
import { type BankAccount, settingsService } from "@/features/settings/services/settings-service"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { fromCents, toCents, todayISO } from "@/features/bank-accounts/services/balances"
import { type Invoice, payInvoice, shiftInvoiceKey } from "../services/invoices"
import { DatePicker } from "@/components/ds"

const supabase = createClient()

interface PayInvoiceDialogProps {
    cardName: string
    invoice: Invoice
    onSuccess?: () => void
}

/**
 * Paga a fatura debitando uma conta. Pode ser o valor total ou parcial:
 * o que faltar vai para a fatura seguinte como saldo anterior.
 */
export function PayInvoiceDialog({ cardName, invoice, onSuccess }: PayInvoiceDialogProps) {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [contaId, setContaId] = useState("")
    const [data, setData] = useState(todayISO())
    const [parcial, setParcial] = useState(false)
    const [valor, setValor] = useState("")

    const openIds = invoice.compras.filter(c => c.status !== "liquidado").map(c => c.id)
    const competencia = format(parseLocalDate(`${invoice.key}-01`), "MMMM 'de' yyyy", { locale: ptBR })
    const proxima = format(parseLocalDate(`${shiftInvoiceKey(invoice.key, 1)}-01`), "MM/yyyy")

    const devidoCents = toCents(invoice.em_aberto)
    const valorCents = parcial ? toCents(valor.replace(",", ".")) : devidoCents
    const valorValido = valorCents > 0 && valorCents <= devidoCents
    const restante = fromCents(Math.max(devidoCents - valorCents, 0))

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) return
        setData(todayISO())
        setParcial(false)
        setValor("")
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
                valor: parcial ? fromCents(valorCents) : null,
            })
            toast.success(restante > 0 ? "Pagamento parcial registrado!" : "Fatura paga!", {
                description: restante > 0
                    ? `${formatCurrency(fromCents(valorCents))} debitados; ${formatCurrency(restante)} vão para a fatura de ${proxima}.`
                    : `${formatCurrency(fromCents(valorCents))} debitados da conta.`,
            })
            notify?.()
            onSuccess?.()
            setOpen(false)
        } catch (err) {
            console.error(err)
            toast.error(getErrorMessage(err, "Erro ao pagar a fatura"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={invoice.em_aberto <= 0}>
                    Pagar fatura
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pagar fatura {cardName}</DialogTitle>
                    <DialogDescription>
                        Fatura de {competencia}, vencimento em {format(parseLocalDate(invoice.vencimento), "dd/MM/yyyy")}.
                        O valor sai da conta escolhida; as compras ficam marcadas como pagas.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-xl bg-secondary/50 p-4 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total da fatura</span>
                        <span className="text-xl font-bold tabular-nums">{formatCurrency(invoice.em_aberto)}</span>
                    </div>
                    {invoice.saldo_anterior > 0 && (
                        <p className="-mt-2 text-xs text-muted-foreground">
                            Inclui {formatCurrency(invoice.saldo_anterior)} de saldo da fatura anterior.
                        </p>
                    )}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={parcial} onCheckedChange={v => setParcial(v === true)} />
                            Pagar outro valor (parcial)
                        </label>
                        {parcial && (
                            <div className="space-y-1.5">
                                <Label htmlFor="fatura-valor" className="sr-only">Valor a pagar</Label>
                                <Input
                                    id="fatura-valor"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={fromCents(devidoCents)}
                                    inputMode="decimal"
                                    value={valor}
                                    onChange={e => setValor(e.target.value)}
                                    placeholder="Valor a pagar"
                                    autoFocus
                                />
                                {valorValido && restante > 0 && (
                                    <p className="text-xs text-warning">
                                        {formatCurrency(restante)} irão para a fatura de {proxima}. Juros do banco, se houver, lance como compra no cartão.
                                    </p>
                                )}
                                {valor !== "" && !valorValido && (
                                    <p className="text-xs text-destructive">Informe um valor entre R$ 0,01 e {formatCurrency(fromCents(devidoCents))}.</p>
                                )}
                            </div>
                        )}
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
                            <DatePicker id="fatura-data" value={data} onChange={setData} />
                        </div>
                    </div>
                    {accounts.length === 0 && (
                        <p className="text-xs text-muted-foreground">Cadastre uma conta bancária em Configurações para pagar a fatura.</p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button type="submit" disabled={saving || !contaId || !data || !valorValido}>
                            {saving ? "Pagando..." : "Confirmar pagamento"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
