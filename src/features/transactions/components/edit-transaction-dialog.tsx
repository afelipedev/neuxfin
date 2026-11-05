"use client"

import { useState } from "react"
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
import { Transaction, buildStatusUpdate } from "../services/transactions"
import { useCategories } from "@/features/settings/hooks/use-categories"
import { BankAccount, settingsService } from "@/features/settings/services/settings-service"
import { todayISO } from "@/features/bank-accounts/services/balances"

interface EditTransactionDialogProps {
    transaction: Transaction
    onSuccess?: () => void
    trigger?: React.ReactNode
}

const NO_ACCOUNT = "__none__"

type FormState = {
    descricao: string
    valor: string
    tipo: Transaction['tipo']
    categoria_id: string
    data_vencimento: string
    status: Transaction['status']
    data_pagamento: string
    conta_id: string
}

function toFormState(t: Transaction): FormState {
    return {
        descricao: t.descricao,
        valor: t.valor.toString(),
        tipo: t.tipo,
        categoria_id: t.categoria_id,
        data_vencimento: t.data_vencimento.split('T')[0],
        // "atrasado" é derivado do vencimento; no formulário tratamos como pendente
        status: t.status === 'atrasado' ? 'pendente' : t.status,
        data_pagamento: t.data_pagamento?.split('T')[0] ?? '',
        conta_id: t.conta_id ?? NO_ACCOUNT,
    }
}

export function EditTransactionDialog({ transaction, onSuccess, trigger }: EditTransactionDialogProps) {
    const [open, setOpen] = useState(false)
    const { update, loading } = useTransactionActions()
    const { categories } = useCategories()
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [formData, setFormData] = useState<FormState>(() => toFormState(transaction))

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) return
        setFormData(toFormState(transaction))
        settingsService.getBankAccounts().then(setAccounts).catch(console.error)
    }

    const isPaid = formData.status === 'liquidado'
    const isCardPurchase = !!transaction.cartao_id && formData.conta_id === NO_ACCOUNT

    const handleStatusChange = (status: Transaction['status']) => {
        setFormData(prev => ({
            ...prev,
            status,
            data_pagamento: status === 'liquidado' ? (prev.data_pagamento || todayISO()) : '',
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const contaId = formData.conta_id === NO_ACCOUNT ? null : formData.conta_id
        const success = await update(transaction.id, {
            descricao: formData.descricao,
            valor: parseFloat(formData.valor),
            tipo: formData.tipo,
            categoria_id: formData.categoria_id,
            data_vencimento: formData.data_vencimento,
            ...buildStatusUpdate(formData.status, formData.data_pagamento || null, contaId),
        })

        if (success) {
            setOpen(false)
            onSuccess?.()
        }
    }

    const filteredCategories = categories.filter((c: { tipo: string }) => c.tipo === transaction.tipo_transacao)

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label="Editar transação">
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
                                min="0.01"
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

                    <div className="grid grid-cols-2 gap-4">
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

                        <div className="space-y-2">
                            <Label htmlFor="conta_id">Conta bancária</Label>
                            <Select
                                value={formData.conta_id}
                                onValueChange={(value) => setFormData({ ...formData, conta_id: value })}
                            >
                                <SelectTrigger id="conta_id">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_ACCOUNT}>Sem conta</SelectItem>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                            <Select value={formData.status} onValueChange={handleStatusChange}>
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="liquidado">
                                        {transaction.tipo_transacao === 'receita' ? 'Recebido' : 'Pago'}
                                    </SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isPaid && (
                        <div className="space-y-2">
                            <Label htmlFor="data_pagamento">
                                Data do {transaction.tipo_transacao === 'receita' ? 'recebimento' : 'pagamento'}
                            </Label>
                            <Input
                                id="data_pagamento"
                                type="date"
                                value={formData.data_pagamento}
                                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    {isPaid && formData.conta_id === NO_ACCOUNT && !isCardPurchase && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            Sem conta vinculada, este lançamento não altera o saldo de nenhuma conta.
                        </p>
                    )}

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
