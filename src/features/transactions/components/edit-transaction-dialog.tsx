"use client"

import { useState, useEffect } from "react"
import { Edit } from "lucide-react"
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
import { useCategories } from "@/features/settings/hooks/use-categories"

interface EditTransactionDialogProps {
    transaction: Transaction
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function EditTransactionDialog({ transaction, onSuccess, trigger }: EditTransactionDialogProps) {
    const [open, setOpen] = useState(false)
    const { update, loading } = useTransactionActions()
    const { categories } = useCategories()

    const [formData, setFormData] = useState({
        descricao: transaction.descricao,
        valor: transaction.valor.toString(),
        tipo: transaction.tipo,
        categoria_id: transaction.categoria_id,
        data_vencimento: transaction.data_vencimento.split('T')[0],
        status: transaction.status,
    })

    useEffect(() => {
        if (open) {
            setFormData({
                descricao: transaction.descricao,
                valor: transaction.valor.toString(),
                tipo: transaction.tipo,
                categoria_id: transaction.categoria_id,
                data_vencimento: transaction.data_vencimento.split('T')[0],
                status: transaction.status,
            })
        }
    }, [open, transaction])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const success = await update(transaction.id, {
            ...formData,
            valor: parseFloat(formData.valor),
        })

        if (success) {
            setOpen(false)
            onSuccess?.()
        }
    }

    const filteredCategories = categories.filter((c: { tipo: string }) => c.tipo === transaction.tipo_transacao)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                        <Edit className="h-3.5 w-3.5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Transação</DialogTitle>
                    <DialogDescription>
                        Atualize as informações da transação
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Input
                            id="descricao"
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="valor">Valor</Label>
                            <Input
                                id="valor"
                                type="number"
                                step="0.01"
                                value={formData.valor}
                                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tipo">Tipo</Label>
                            <Select
                                value={formData.tipo}
                                onValueChange={(value: 'PF' | 'PJ') =>
                                    setFormData({ ...formData, tipo: value })
                                }
                            >
                                <SelectTrigger id="tipo">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PF">PF</SelectItem>
                                    <SelectItem value="PJ">PJ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="categoria_id">Categoria</Label>
                        <Select
                            value={formData.categoria_id}
                            onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                        >
                            <SelectTrigger id="categoria_id">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCategories.map((cat: { id: string; nome: string }) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                            <Input
                                id="data_vencimento"
                                type="date"
                                value={formData.data_vencimento}
                                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value: 'liquidado' | 'pendente' | 'atrasado') =>
                                    setFormData({ ...formData, status: value })
                                }
                            >
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="liquidado">Liquidado</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="atrasado">Atrasado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
