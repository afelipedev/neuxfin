"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
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
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { deleteTransfer } from "../services/transfers"

/** Exclui uma transferência (remove a saída da origem e a entrada do destino). */
export function DeleteTransferButton({ transferId }: { transferId: string }) {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        try {
            setLoading(true)
            await deleteTransfer(transferId)
            toast.success("Transferência excluída")
            notify?.()
        } catch (err) {
            console.error(err)
            toast.error("Erro ao excluir transferência")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label="Excluir transferência" disabled={loading}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir transferência?</AlertDialogTitle>
                    <AlertDialogDescription>
                        A saída da conta de origem e a entrada na conta de destino serão removidas, e os saldos das duas contas serão recalculados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
