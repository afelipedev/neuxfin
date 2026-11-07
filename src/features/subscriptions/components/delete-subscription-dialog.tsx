"use client"

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
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useSubscriptionActions } from "../hooks/use-subscriptions"
import { Subscription } from "../services/subscriptions"

interface DeleteSubscriptionDialogProps {
    subscription: Subscription
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function DeleteSubscriptionDialog({ subscription, onSuccess, trigger }: DeleteSubscriptionDialogProps) {
    const { remove, loading } = useSubscriptionActions()

    async function handleDelete() {
        const success = await remove(subscription.id)
        if (success) {
            onSuccess?.()
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir assinatura">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Assinatura</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja excluir a assinatura <strong>{subscription.nome}</strong>?
                        <br />
                        <br />
                        Esta ação não poderá ser desfeita. As despesas já geradas a partir desta assinatura
                        não serão excluídas automaticamente.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading ? 'Excluindo...' : 'Excluir'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
