"use client"

import { useState } from "react"
import { CheckCircle2, RotateCcw } from "lucide-react"
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
import { useTransactionActions } from "../hooks/use-transactions"
import { Transaction } from "../services/transactions"
import { BankAccount, settingsService } from "@/features/settings/services/settings-service"
import { todayISO } from "@/features/bank-accounts/services/balances"
import { formatCurrency } from "@/lib/utils"

type SettleTarget = Pick<Transaction, 'id' | 'status' | 'tipo_transacao' | 'descricao'> & {
    valor: number | string
    conta_id?: string | null
}

interface SettleTransactionDialogProps {
    transaction: SettleTarget
    onSuccess?: () => void
}

/**
 * Ação rápida: marca a transação como paga/recebida escolhendo data e conta,
 * ou desfaz a liquidação. Notifica o TransactionContext (via useTransactionActions).
 */
export function SettleTransactionDialog({ transaction, onSuccess }: SettleTransactionDialogProps) {
    const { updateStatus, loading } = useTransactionActions()
    const [open, setOpen] = useState(false)
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [dataPagamento, setDataPagamento] = useState(todayISO())
    const [contaId, setContaId] = useState(transaction.conta_id ?? "")

    const isReceita = transaction.tipo_transacao === 'receita'
    const verb = isReceita ? 'Receber' : 'Pagar'

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) return
        setDataPagamento(todayISO())
        setContaId(transaction.conta_id ?? "")
        settingsService.getBankAccounts().then(setAccounts).catch(console.error)
    }

    if (transaction.status === 'liquidado') {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                title={isReceita ? "Desfazer recebimento" : "Desfazer pagamento"}
                aria-label={isReceita ? "Desfazer recebimento" : "Desfazer pagamento"}
                disabled={loading}
                onClick={async () => {
                    if (await updateStatus(transaction.id, 'pendente')) onSuccess?.()
                }}
            >
                <RotateCcw className="h-3.5 w-3.5" />
            </Button>
        )
    }

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!contaId) return
        const ok = await updateStatus(transaction.id, 'liquidado', dataPagamento, contaId)
        if (ok) {
            setOpen(false)
            onSuccess?.()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                    title={`Marcar como ${isReceita ? 'recebida' : 'paga'}`}
                    aria-label={`Marcar como ${isReceita ? 'recebida' : 'paga'}`}
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>{verb} lançamento</DialogTitle>
                    <DialogDescription>
                        {transaction.descricao} · {formatCurrency(Number(transaction.valor))}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleConfirm} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="settle-date">Data do {isReceita ? 'recebimento' : 'pagamento'}</Label>
                        <Input
                            id="settle-date"
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="settle-account">Conta {isReceita ? 'de destino' : 'de saída'}</Label>
                        <Select value={contaId} onValueChange={setContaId}>
                            <SelectTrigger id="settle-account">
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {accounts.length === 0 && (
                            <p className="text-xs text-muted-foreground">Cadastre uma conta em Configurações.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !contaId}>
                            {loading ? 'Salvando...' : `Confirmar`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
