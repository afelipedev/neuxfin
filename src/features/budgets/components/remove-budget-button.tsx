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
import { createClient } from "@/lib/supabase/client"
import { getErrorMessage } from "@/lib/utils"
import { removeBudget } from "../services/budgets"

export function RemoveBudgetButton({ budgetId, nome, onRemoved }: { budgetId: string; nome: string; onRemoved: () => void }) {
    const [loading, setLoading] = useState(false)

    const handleRemove = async () => {
        try {
            setLoading(true)
            await removeBudget(createClient(), budgetId)
            toast.success("Orçamento removido")
            onRemoved()
        } catch (err) {
            console.error(err)
            toast.error(getErrorMessage(err, "Erro ao remover orçamento"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={`Remover orçamento de ${nome}`} disabled={loading}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Remover orçamento de {nome}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        As despesas não são alteradas; só deixa de existir o limite mensal para esta categoria.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Remover
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
