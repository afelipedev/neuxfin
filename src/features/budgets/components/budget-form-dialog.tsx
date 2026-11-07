"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
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
import { createClient } from "@/lib/supabase/client"
import { getErrorMessage } from "@/lib/utils"
import { type Category, settingsService } from "@/features/settings/services/settings-service"
import { type Budget, type BudgetProfile, saveBudget } from "../services/budgets"

const AMBOS = "AMBOS"

interface BudgetFormDialogProps {
    /** Edição; sem valor cria um novo */
    budget?: Budget
    /** Categorias que já têm orçamento (não aparecem para criar outro) */
    usedCategoryIds?: string[]
    onSaved: () => void
    trigger?: React.ReactNode
}

export function BudgetFormDialog({ budget, usedCategoryIds = [], onSaved, trigger }: BudgetFormDialogProps) {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])
    const [categoriaId, setCategoriaId] = useState("")
    const [valor, setValor] = useState("")
    const [tipo, setTipo] = useState<string>(AMBOS)

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) return
        setCategoriaId(budget?.categoria_id ?? "")
        setValor(budget ? String(Number(budget.valor_mensal)) : "")
        setTipo(budget?.tipo ?? AMBOS)
        settingsService.getCategories()
            .then(list => setCategories(list.filter(c => c.tipo === "despesa")))
            .catch(console.error)
    }

    const available = categories.filter(c => c.id === budget?.categoria_id || !usedCategoryIds.includes(c.id))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setSaving(true)
            await saveBudget(createClient(), {
                categoria_id: categoriaId,
                valor_mensal: Number(valor),
                tipo: tipo === AMBOS ? null : (tipo as BudgetProfile),
            }, budget?.id)
            toast.success(budget ? "Orçamento atualizado" : "Orçamento criado")
            onSaved()
            setOpen(false)
        } catch (err) {
            console.error(err)
            toast.error(getErrorMessage(err, "Erro ao salvar orçamento"))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="h-4 w-4" />
                        Novo orçamento
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{budget ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
                    <DialogDescription>
                        Limite de gasto por mês na categoria. Contam as despesas do mês, pagas ou não, inclusive no cartão.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="orc-categoria">Categoria</Label>
                        <Select value={categoriaId} onValueChange={setCategoriaId} disabled={!!budget}>
                            <SelectTrigger id="orc-categoria"><SelectValue placeholder="Escolha a categoria" /></SelectTrigger>
                            <SelectContent>
                                {available.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {!budget && categories.length > 0 && available.length === 0 && (
                            <p className="text-xs text-muted-foreground">Todas as categorias de despesa já têm orçamento.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="orc-valor">Limite mensal</Label>
                            <Input id="orc-valor" type="number" step="0.01" min="0.01" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="orc-tipo">Perfil</Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger id="orc-tipo"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={AMBOS}>PF e PJ</SelectItem>
                                    <SelectItem value="PF">Só PF</SelectItem>
                                    <SelectItem value="PJ">Só PJ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                        <Button type="submit" disabled={saving || !categoriaId || !(Number(valor) > 0)}>{saving ? "Salvando..." : "Salvar"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
