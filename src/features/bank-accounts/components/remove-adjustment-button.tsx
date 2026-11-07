"use client"

import { useState } from "react"
import { Undo2 } from "lucide-react"
import { toast } from "sonner"
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
import { getErrorMessage } from "@/lib/utils"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { removeAdjustment } from "../services/adjustments"

/** Desfaz um ajuste de saldo (o saldo da conta volta ao valor calculado). */
export function RemoveAdjustmentButton({ adjustmentId }: { adjustmentId: string }) {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const [loading, setLoading] = useState(false)

    const handleRemove = async () => {
        try {
            setLoading(true)
            await removeAdjustment(adjustmentId)
            toast.success("Ajuste desfeito")
            notify?.()
        } catch (err) {
            console.error(err)
            toast.error(getErrorMessage(err, "Erro ao desfazer ajuste"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label="Desfazer ajuste" disabled={loading}>
                    <Undo2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Desfazer ajuste de saldo?</AlertDialogTitle>
                    <AlertDialogDescription>
                        O ajuste sai do extrato e o saldo da conta volta a ser só o calculado pelos lançamentos.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove}>Desfazer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
