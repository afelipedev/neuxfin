"use client"

import { useState } from "react"
import { Scale } from "lucide-react"
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
import { Amount, DatePicker } from "@/components/ds"
import { formatCurrency, getErrorMessage } from "@/lib/utils"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { createClient } from "@/lib/supabase/client"
import { createAdjustment } from "../services/adjustments"
import { type BalanceTx, computeAccountBalance, fetchAccountTransactions, reconciliationDelta, toCents, todayISO } from "../services/balances"

interface AdjustBalanceDialogProps {
    contaId: string
    /** Saldo calculado da conta ao fim do dia informado. Sem ele, o dialog busca os movimentos ao abrir. */
    balanceAt?: (date: string) => number
    /** Necessário quando balanceAt não é informado */
    account?: { saldo_inicial: number | string | null; data_saldo_inicial?: string | null }
    trigger?: React.ReactNode
    onSaved?: () => void
}

/**
 * Conciliação: o usuário informa o saldo real do banco numa data e o app lança
 * a diferença como ajuste (não é receita nem despesa, só corrige o saldo).
 */
export function AdjustBalanceDialog({ contaId, balanceAt, account, trigger, onSaved }: AdjustBalanceDialogProps) {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [data, setData] = useState(todayISO())
    const [saldoReal, setSaldoReal] = useState("")
    const [descricao, setDescricao] = useState("")
    const [movimentos, setMovimentos] = useState<BalanceTx[] | null>(null)

    const carregando = !balanceAt && movimentos === null
    const calculado = balanceAt
        ? balanceAt(data)
        : computeAccountBalance(account?.saldo_inicial ?? 0, movimentos ?? [], data, account?.data_saldo_inicial)
    const informado = saldoReal.trim() === "" ? null : Number(saldoReal.replace(",", "."))
    const valido = informado !== null && Number.isFinite(informado)
    const delta = valido ? reconciliationDelta(calculado, informado) : 0
    const semDiferenca = valido && toCents(delta) === 0

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) return
        setData(todayISO())
        setSaldoReal("")
        setDescricao("")
        if (!balanceAt) {
            setMovimentos(null)
            fetchAccountTransactions(createClient(), contaId)
                .then(setMovimentos)
                .catch(err => {
                    console.error(err)
                    toast.error(getErrorMessage(err, "Erro ao calcular o saldo da conta"))
                    setOpen(false)
                })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!valido || semDiferenca) return
        try {
            setSaving(true)
            await createAdjustment({ conta_id: contaId, valor: delta, data, descricao: descricao || null })
            toast.success(`Saldo ajustado em ${formatCurrency(delta)}`)
            notify?.()
            onSaved?.()
            setOpen(false)
        } catch (err) {
            console.error(err)
            toast.error(getErrorMessage(err, "Erro ao ajustar saldo"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <Scale className="h-4 w-4" />
                        Ajustar saldo
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ajustar saldo</DialogTitle>
                    <DialogDescription>
                        Informe o saldo que aparece no banco. A diferença vira um ajuste: não conta como receita nem despesa.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ajuste-data">Data</Label>
                            <DatePicker id="ajuste-data" value={data} onChange={setData} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ajuste-saldo">Saldo no banco</Label>
                            <Input
                                id="ajuste-saldo"
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                value={saldoReal}
                                onChange={e => setSaldoReal(e.target.value)}
                                placeholder="0,00"
                                required
                            />
                        </div>
                    </div>

                    <dl className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
                        <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Saldo no NeuxFin</dt>
                            <dd>{carregando ? "…" : <Amount value={calculado} kind="auto" />}</dd>
                        </div>
                        <div className="flex justify-between gap-2 font-medium">
                            <dt>Ajuste</dt>
                            <dd>{valido ? <Amount value={delta} kind="auto" signed /> : "—"}</dd>
                        </div>
                    </dl>
                    {semDiferenca && <p className="text-xs text-muted-foreground">Os saldos já batem, não há o que ajustar.</p>}

                    <div className="space-y-2">
                        <Label htmlFor="ajuste-desc">Motivo (opcional)</Label>
                        <Input id="ajuste-desc" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Tarifa não lançada" />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button type="submit" disabled={saving || carregando || !valido || semDiferenca}>{saving ? "Salvando..." : "Ajustar"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
