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
import { createClient } from "@/lib/supabase/client"
import { useTransactionContextOptional } from "@/features/transactions/context/transaction-context"
import { reverseInvoicePayment } from "../services/invoices"

const supabase = createClient()

/** Estorna o pagamento da fatura: o débito sai da conta e as compras voltam a ficar em aberto. */
export function ReverseInvoiceButton({ pagamentoId, onSuccess }: { pagamentoId: string; onSuccess?: () => void }) {
    const notify = useTransactionContextOptional()?.notifyTransactionChange
    const [loading, setLoading] = useState(false)

    const handleReverse = async () => {
        try {
            setLoading(true)
            await reverseInvoicePayment(supabase, pagamentoId)
            toast.success("Pagamento estornado")
            notify?.()
            onSuccess?.()
        } catch (err) {
            console.error(err)
            toast.error(err instanceof Error ? err.message : "Erro ao estornar pagamento")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading} className="gap-2">
                    <Undo2 className="h-4 w-4" /> Estornar pagamento
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Estornar pagamento da fatura?</AlertDialogTitle>
                    <AlertDialogDescription>
                        O débito na conta será desfeito e as compras desta fatura voltarão a ficar em aberto.
                        O registro do pagamento fica no histórico como estornado.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReverse} className="bg-rose-600 hover:bg-rose-700 text-white">
                        Estornar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
