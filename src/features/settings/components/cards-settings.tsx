"use client"

import { DataTablePagination, usePaginatedList } from "@/components/data-table-pagination"
import * as React from "react"
import { Plus, Trash2, Edit, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardThumb, DEFAULT_CARD_COLOR } from "@/features/credit-cards/components/card-thumb"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { formatCurrency } from "@/lib/utils"

export function CardsSettings() {
    const [cards, setCards] = React.useState<ICreditCard[]>([])
    const paged = usePaginatedList(cards, 10)
    const [loading, setLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingCard, setEditingCard] = React.useState<ICreditCard | null>(null)
    const [formData, setFormData] = React.useState({
        nome: "",
        bandeira: "Visa",
        limite: 0,
        dia_vencimento: 10,
        dia_fechamento: 3,
        cor: DEFAULT_CARD_COLOR, // Indigo
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
            setFormData({ nome: "", bandeira: "Visa", limite: 0, dia_vencimento: 10, dia_fechamento: 3, cor: DEFAULT_CARD_COLOR })
            fetchCards()
        } catch {
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
            // 23503: bloqueado pelo banco (cartão com compras ou faturas pagas)
            const err = error as { code?: string; message?: string }
            toast.error("Erro ao excluir", {
                description: err?.code === '23503'
                    ? (err.message?.includes('compras') ? err.message : "Este cartão possui faturas pagas e não pode ser excluído.")
                    : "Não foi possível excluir o cartão."
            })
            setDeletingId(null)
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
            cor: card.cor || DEFAULT_CARD_COLOR,
        })
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingCard(null)
        setFormData({ nome: "", bandeira: "Visa", limite: 0, dia_vencimento: 10, dia_fechamento: 3, cor: DEFAULT_CARD_COLOR })
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Cartões de Crédito</h2>
                    <p className="text-sm text-muted-foreground">Gerencie seus limites e datas de fatura</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog} className="w-full sm:w-auto justify-center">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <Button type="submit" disabled={saving} className="w-full">
                                {saving ? "Salvando..." : editingCard ? "Atualizar Cartão" : "Salvar Cartão"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="gap-0 overflow-hidden py-0">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="px-6">Cartão</TableHead>
                                <TableHead >Bandeira</TableHead>
                                <TableHead >Datas (F/V)</TableHead>
                                <TableHead className="text-right">Limite</TableHead>
                                <TableHead className="text-right px-6">Ações</TableHead>
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
                                paged.pageItems.map((card) => (
                                    <TableRow key={card.id} className="border-border hover:bg-muted transition-colors">
                                        <TableCell className="font-medium px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <CardThumb color={card.cor} brand={card.bandeira} size="sm" />
                                                <span className="font-medium">{card.nome}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {card.bandeira || "Outra"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>F: {card.dia_fechamento} / V: {card.dia_vencimento}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums">
                                            {formatCurrency(card.limite)}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-muted-foreground"
                                                    onClick={() => openEditDialog(card)}
                                                    aria-label={`Editar ${card.nome}`}
                                                >
                                                    <Edit />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-destructive"
                                                    onClick={() => setDeletingId(card.id)}
                                                    aria-label={`Excluir ${card.nome}`}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <DataTablePagination
                        page={paged.page}
                        pageSize={paged.pageSize}
                        totalCount={paged.totalCount}
                        onPageChange={paged.setPage}
                        onPageSizeChange={paged.setPageSize}
                    />
                </CardContent>
            </Card>

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Só é possível excluir cartões sem compras lançadas
                            e sem faturas pagas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
