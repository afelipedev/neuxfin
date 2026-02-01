"use client"

import { useState } from "react"
import { Copy, Calendar } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useTransactionActions } from "../hooks/use-transactions"
import { Transaction } from "../services/transactions"

interface ReplicateDialogProps {
    transactions: Transaction[]
    onSuccess?: () => void
}

export function ReplicateDialog({ transactions, onSuccess }: ReplicateDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
    const [selectedMonths, setSelectedMonths] = useState<{ month: number, year: number }[]>([])
    const { replicate, loading } = useTransactionActions()

    // Gerar próximos 12 meses
    const getNextMonths = () => {
        const months = []
        const now = new Date()

        for (let i = 1; i <= 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
            months.push({
                month: date.getMonth() + 1,
                year: date.getFullYear(),
                label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            })
        }

        return months
    }

    const nextMonths = getNextMonths()

    const handleToggleTransaction = (id: string) => {
        setSelectedTransactions(prev =>
            prev.includes(id)
                ? prev.filter(t => t !== id)
                : [...prev, id]
        )
    }

    const handleToggleMonth = (month: number, year: number) => {
        setSelectedMonths(prev => {
            const exists = prev.some(m => m.month === month && m.year === year)
            if (exists) {
                return prev.filter(m => !(m.month === month && m.year === year))
            } else {
                return [...prev, { month, year }]
            }
        })
    }

    const handleReplicate = async () => {
        if (selectedTransactions.length === 0 || selectedMonths.length === 0) {
            return
        }

        const success = await replicate(selectedTransactions, selectedMonths)

        if (success) {
            setOpen(false)
            setSelectedTransactions([])
            setSelectedMonths([])
            onSuccess?.()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-zinc-900/5 dark:bg-zinc-100/5 border-none">
                    <Copy className="mr-2 h-4 w-4" />
                    Replicar Transações
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Replicar Transações</DialogTitle>
                    <DialogDescription>
                        Selecione as transações e os meses para os quais deseja replicá-las
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Seleção de Transações */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Transações a Replicar</Label>
                        <div className="border rounded-lg p-4 space-y-2 max-h-[200px] overflow-y-auto bg-zinc-900/5 dark:bg-zinc-100/5">
                            {transactions.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Nenhuma transação disponível
                                </p>
                            ) : (
                                transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`transaction-${transaction.id}`}
                                            checked={selectedTransactions.includes(transaction.id)}
                                            onCheckedChange={() => handleToggleTransaction(transaction.id)}
                                        />
                                        <Label
                                            htmlFor={`transaction-${transaction.id}`}
                                            className="flex-1 text-sm cursor-pointer"
                                        >
                                            <span className="font-medium">{transaction.descricao}</span>
                                            <span className="text-muted-foreground ml-2">
                                                - R$ {Number(transaction.valor).toFixed(2)}
                                            </span>
                                        </Label>
                                    </div>
                                ))
                            )}
                        </div>
                        {transactions.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (selectedTransactions.length === transactions.length) {
                                        setSelectedTransactions([])
                                    } else {
                                        setSelectedTransactions(transactions.map(t => t.id))
                                    }
                                }}
                                className="text-xs"
                            >
                                {selectedTransactions.length === transactions.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                            </Button>
                        )}
                    </div>

                    {/* Seleção de Meses */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Meses de Destino</Label>
                        <div className="border rounded-lg p-4 grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto bg-zinc-900/5 dark:bg-zinc-100/5">
                            {nextMonths.map(({ month, year, label }) => (
                                <div key={`${year}-${month}`} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`month-${year}-${month}`}
                                        checked={selectedMonths.some(m => m.month === month && m.year === year)}
                                        onCheckedChange={() => handleToggleMonth(month, year)}
                                    />
                                    <Label
                                        htmlFor={`month-${year}-${month}`}
                                        className="text-sm cursor-pointer capitalize"
                                    >
                                        {label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resumo */}
                    {(selectedTransactions.length > 0 || selectedMonths.length > 0) && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                <strong>{selectedTransactions.length}</strong> transação(ões) será(ão) replicada(s) para{' '}
                                <strong>{selectedMonths.length}</strong> mês(es), criando{' '}
                                <strong>{selectedTransactions.length * selectedMonths.length}</strong> nova(s) transação(ões).
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleReplicate}
                        disabled={loading || selectedTransactions.length === 0 || selectedMonths.length === 0}
                    >
                        {loading ? 'Replicando...' : 'Replicar Transações'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
