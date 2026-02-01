"use client"

import * as React from "react"
import { Plus, CreditCard, Trash2, Edit, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { settingsService, CreditCard as ICreditCard } from "../services/settings-service"
import { toast } from "sonner"

export function CardsSettings() {
    const [cards, setCards] = React.useState<ICreditCard[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingCard, setEditingCard] = React.useState<ICreditCard | null>(null)
    const [formData, setFormData] = React.useState({
        nome: "",
        bandeira: "Visa",
        limite: 0,
        dia_vencimento: 10,
        dia_fechamento: 3,
        cor: "#6366f1", // Indigo
    })
    const [deletingId, setDeletingId] = React.useState<string | null>(null)
    const [saving, setSaving] = React.useState(false)

    const fetchCards = React.useCallback(async () => {
        try {
            const data = await settingsService.getCreditCards()
            setCards(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchCards()
    }, [fetchCards])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editingCard) {
                await settingsService.updateCreditCard(editingCard.id, formData)
                toast.success("Cartão atualizado", {
                    description: `O cartão ${formData.nome} foi atualizado com sucesso.`
                })
            } else {
                await settingsService.createCreditCard(formData)
                toast.success("Cartão cadastrado", {
                    description: `O cartão ${formData.nome} foi cadastrado com sucesso.`
                })
            }
            setIsDialogOpen(false)
            setEditingCard(null)
            setFormData({ nome: "", bandeira: "Visa", limite: 0, dia_vencimento: 10, dia_fechamento: 3, cor: "#6366f1" })
            fetchCards()
        } catch (error) {
            toast.error(editingCard ? "Erro ao atualizar cartão" : "Erro ao cadastrar cartão", {
                description: "Ocorreu um erro ao processar sua solicitação."
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        try {
            await settingsService.deleteCreditCard(deletingId)
            toast.success("Cartão excluído", {
                description: "O cartão foi removido com sucesso."
            })
            setDeletingId(null)
            fetchCards()
        } catch (error) {
            toast.error("Erro ao excluir", {
                description: "Não foi possível excluir o cartão."
            })
        }
    }

    const openEditDialog = (card: ICreditCard) => {
        setEditingCard(card)
        setFormData({
            nome: card.nome,
            bandeira: card.bandeira || "Visa",
            limite: card.limite,
            dia_vencimento: card.dia_vencimento,
            dia_fechamento: card.dia_fechamento,
            cor: card.cor || "#6366f1",
        })
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingCard(null)
        setFormData({ nome: "", bandeira: "Visa", limite: 0, dia_vencimento: 10, dia_fechamento: 3, cor: "#6366f1" })
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Cartões de Crédito</h2>
                    <p className="text-sm text-muted-foreground">Gerencie seus limites e datas de fatura</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog} className="bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold">
                        <Plus className="mr-2 h-4 w-4" /> Novo Cartão
                    </Button>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingCard ? "Editar Cartão de Crédito" : "Novo Cartão de Crédito"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome Personalizado</Label>
                                <Input
                                    id="nome"
                                    placeholder="Ex: Nubank Principal, Visa Infinite..."
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bandeira">Bandeira</Label>
                                    <Select
                                        value={formData.bandeira || "Visa"}
                                        onValueChange={(val) => setFormData({ ...formData, bandeira: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Visa">Visa</SelectItem>
                                            <SelectItem value="Mastercard">Mastercard</SelectItem>
                                            <SelectItem value="Elo">Elo</SelectItem>
                                            <SelectItem value="American Express">American Express</SelectItem>
                                            <SelectItem value="Outra">Outra</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="limite">Limite</Label>
                                    <Input
                                        id="limite"
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={formData.limite}
                                        onChange={(e) => setFormData({ ...formData, limite: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vencimento">Dia do Vencimento</Label>
                                    <Input
                                        id="vencimento"
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.dia_vencimento}
                                        onChange={(e) => setFormData({ ...formData, dia_vencimento: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="fechamento">Dia do Fechamento</Label>
                                    <Input
                                        id="fechamento"
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.dia_fechamento}
                                        onChange={(e) => setFormData({ ...formData, dia_fechamento: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cor">Cor do Cartão</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="cor"
                                        type="color"
                                        className="w-12 h-10 p-1"
                                        value={formData.cor}
                                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                                    />
                                    <Input
                                        value={formData.cor}
                                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                                        className="font-mono flex-1"
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={saving} className="w-full bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold">
                                {saving ? "Salvando..." : editingCard ? "Atualizar Cartão" : "Salvar Cartão"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-none hover:bg-transparent text-muted-foreground">
                                <TableHead className="font-medium text-xs h-10 px-6">Cartão</TableHead>
                                <TableHead className="font-medium text-xs h-10">Bandeira</TableHead>
                                <TableHead className="font-medium text-xs h-10">Datas (F/V)</TableHead>
                                <TableHead className="font-medium text-xs h-10 text-right">Limite</TableHead>
                                <TableHead className="font-medium text-xs h-10 text-right px-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Carregando cartões...
                                    </TableCell>
                                </TableRow>
                            ) : cards.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        Nenhum cartão cadastrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                cards.map((card) => (
                                    <TableRow key={card.id} className="border-neux-1/5 hover:bg-zinc-900/5 dark:hover:bg-zinc-100/5 transition-colors">
                                        <TableCell className="font-medium px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-6 rounded flex items-center justify-center text-[8px] font-black text-white/50"
                                                    style={{ backgroundColor: card.cor || "#6366f1" }}
                                                >
                                                    CARD
                                                </div>
                                                <span className="font-bold">{card.nome}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="ghost" className="bg-zinc-900/5 dark:bg-zinc-100/10 text-[10px] uppercase font-bold">
                                                {card.bandeira || "Outra"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>F: {card.dia_fechamento} / V: {card.dia_vencimento}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limite)}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground"
                                                    onClick={() => openEditDialog(card)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-rose-500"
                                                    onClick={() => setDeletingId(card.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o cartão de crédito
                            e todas as faturas e transações associadas a ele.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-rose-500 hover:bg-rose-600 text-white"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
