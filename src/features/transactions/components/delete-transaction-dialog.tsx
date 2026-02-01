"use client"

import { useState } from "react"
import { Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useTransactionActions } from "../hooks/use-transactions"
import { Transaction } from "../services/transactions"

interface DeleteTransactionDialogProps {
    transaction: Transaction
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function DeleteTransactionDialog({ transaction, onSuccess, trigger }: DeleteTransactionDialogProps) {
    const [open, setOpen] = useState(false)
    const [deleteOption, setDeleteOption] = useState<'single' | 'all'>('single')
    const { remove, loading } = useTransactionActions()

    const isInstallment = transaction.total_parcelas && transaction.total_parcelas > 1

    const handleDelete = async () => {
        const success = await remove(
            transaction.transacao_pai_id || transaction.id,
            deleteOption === 'all'
        )

        if (success) {
            setOpen(false)
            onSuccess?.()
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                        </div>
                        <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="pt-2">
                        Você está prestes a excluir a transação:
                        <div className="mt-2 p-3 bg-zinc-900/5 dark:bg-zinc-100/5 rounded-lg">
                            <p className="font-medium">{transaction.descricao}</p>
                            <p className="text-sm text-muted-foreground">
                                R$ {Number(transaction.valor).toFixed(2)}
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {isInstallment && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium">Esta é uma transação parcelada:</p>
                        <RadioGroup value={deleteOption} onValueChange={(value: 'single' | 'all') => setDeleteOption(value)}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="single" id="single" />
                                <Label htmlFor="single" className="cursor-pointer">
                                    Excluir apenas esta parcela ({transaction.parcela_atual}/{transaction.total_parcelas})
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="all" id="all" />
                                <Label htmlFor="all" className="cursor-pointer">
                                    Excluir todas as {transaction.total_parcelas} parcelas
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-rose-500 hover:bg-rose-600"
                    >
                        {loading ? 'Excluindo...' : 'Excluir'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
