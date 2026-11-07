"use client"

import { useState } from "react"
import { ArrowLeftRight } from "lucide-react"
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
import { BankAccount, settingsService } from "@/features/settings/services/settings-service"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { createTransfer } from "../services/transfers"
import { todayISO } from "../services/balances"
import { DatePicker } from "@/components/ds"

interface TransferDialogProps {
    /** Conta pré-selecionada como origem */
    defaultOrigemId?: string
    trigger?: React.ReactNode
}

/** Transferência entre contas do usuário. Não é receita nem despesa: só move saldo. */
export function TransferDialog({ defaultOrigemId, trigger }: TransferDialogProps) {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [origem, setOrigem] = useState(defaultOrigemId ?? "")
    const [destino, setDestino] = useState("")
    const [valor, setValor] = useState("")
    const [data, setData] = useState(todayISO())
    const [descricao, setDescricao] = useState("")

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) return
        setOrigem(defaultOrigemId ?? "")
        setDestino("")
        setValor("")
        setData(todayISO())
        setDescricao("")
        settingsService.getBankAccounts().then(setAccounts).catch(console.error)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSaving(true)
            await createTransfer({
                conta_origem_id: origem,
                conta_destino_id: destino,
                valor: Number(valor),
                data,
                descricao: descricao.trim() || null,
            })
            toast.success("Transferência registrada!")
            notify?.()
            setOpen(false)
        } catch (err) {
            console.error(err)
            toast.error(err instanceof Error ? err.message : "Erro ao registrar transferência")
        } finally {
            setSaving(false)
        }
    }

    const canSubmit = origem && destino && origem !== destino && Number(valor) > 0 && data

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <ArrowLeftRight className="h-4 w-4" />
                        Transferir
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Transferência entre contas</DialogTitle>
                    <DialogDescription>
                        Move saldo de uma conta para outra. Não conta como receita nem despesa.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="transf-origem">De</Label>
                            <Select value={origem} onValueChange={setOrigem}>
                                <SelectTrigger id="transf-origem"><SelectValue placeholder="Conta de origem" /></SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transf-destino">Para</Label>
                            <Select value={destino} onValueChange={setDestino}>
                                <SelectTrigger id="transf-destino"><SelectValue placeholder="Conta de destino" /></SelectTrigger>
                                <SelectContent>
                                    {accounts.filter(a => a.id !== origem).map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="transf-valor">Valor</Label>
                            <Input id="transf-valor" type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="transf-data">Data</Label>
                            <DatePicker id="transf-data" value={data} onChange={setData} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="transf-desc">Descrição (opcional)</Label>
                        <Input id="transf-desc" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: Reserva para viagem" />
                    </div>
                    {accounts.length < 2 && (
                        <p className="text-xs text-muted-foreground">Você precisa de pelo menos duas contas cadastradas.</p>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button type="submit" disabled={saving || !canSubmit}>{saving ? "Salvando..." : "Transferir"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
