"use client"

import * as React from "react"
import { Plus, Tag, Trash2, Edit, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { settingsService, Category } from "../services/settings-service"
import { toast } from "sonner"

export function CategoriesSettings() {
    const [categories, setCategories] = React.useState<Category[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
    const [formData, setFormData] = React.useState({
        nome: "",
        tipo: "despesa" as "receita" | "despesa",
        cor: "#3b82f6",
    })
    const [deletingId, setDeletingId] = React.useState<string | null>(null)
    const [saving, setSaving] = React.useState(false)

    const fetchCategories = React.useCallback(async () => {
        try {
            const data = await settingsService.getCategories()
            setCategories(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editingCategory) {
                await settingsService.updateCategory(editingCategory.id, formData)
                toast.success("Categoria atualizada", {
                    description: `A categoria ${formData.nome} foi atualizada com sucesso.`
                })
            } else {
                await settingsService.createCategory({
                    ...formData,
                    icone: "Tag"
                })
                toast.success("Categoria criada", {
                    description: `A categoria ${formData.nome} foi criada com sucesso.`
                })
            }
            setIsDialogOpen(false)
            setEditingCategory(null)
            setFormData({ nome: "", tipo: "despesa", cor: "#3b82f6" })
            fetchCategories()
        } catch (error) {
            toast.error(editingCategory ? "Erro ao atualizar categoria" : "Erro ao criar categoria", {
                description: "Ocorreu um erro ao processar sua solicitação."
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        try {
            await settingsService.deleteCategory(deletingId)
            toast.success("Categoria excluída", {
                description: "A categoria foi removida com sucesso."
            })
            setDeletingId(null)
            fetchCategories()
        } catch (error) {
            toast.error("Erro ao excluir", {
                description: "Não foi possível excluir a categoria."
            })
        }
    }

    const openEditDialog = (category: Category) => {
        setEditingCategory(category)
        setFormData({
            nome: category.nome,
            tipo: category.tipo,
            cor: category.cor || "#3b82f6",
        })
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingCategory(null)
        setFormData({ nome: "", tipo: "despesa", cor: "#3b82f6" })
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Gerenciar Categorias</h2>
                    <p className="text-sm text-muted-foreground">Adicione ou remova categorias para suas transações</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog} className="bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold w-full sm:w-auto justify-center">
                        <Plus className="mr-2 h-4 w-4" /> Nova Categoria
                    </Button>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome da Categoria</Label>
                                <Input
                                    id="nome"
                                    placeholder="Ex: Alimentação, Salário..."
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tipo">Tipo</Label>
                                <Select
                                    value={formData.tipo}
                                    onValueChange={(val: "receita" | "despesa") => setFormData({ ...formData, tipo: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="receita">Receita</SelectItem>
                                        <SelectItem value="despesa">Despesa</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cor">Cor</Label>
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
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={saving} className="w-full bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold">
                                {saving ? "Salvando..." : editingCategory ? "Atualizar Categoria" : "Salvar Categoria"}
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
                                <TableHead className="font-medium text-xs h-10 px-6">Categoria</TableHead>
                                <TableHead className="font-medium text-xs h-10">Tipo</TableHead>
                                <TableHead className="font-medium text-xs h-10">Cor</TableHead>
                                <TableHead className="font-medium text-xs h-10 text-right px-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        Carregando categorias...
                                    </TableCell>
                                </TableRow>
                            ) : categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        Nenhuma categoria cadastrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((category) => (
                                    <TableRow key={category.id} className="border-neux-1/5 hover:bg-zinc-900/5 dark:hover:bg-zinc-100/5 transition-colors">
                                        <TableCell className="font-medium px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: category.cor || "#3b82f6" }}
                                                />
                                                {category.nome}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={`border-none text-[10px] h-5 ${category.tipo === "receita"
                                                    ? "bg-emerald-500/20 text-emerald-600"
                                                    : "bg-rose-500/20 text-rose-600"
                                                    }`}
                                            >
                                                {category.tipo === "receita" ? (
                                                    <><ArrowUpRight className="mr-1 h-3 w-3" /> Receita</>
                                                ) : (
                                                    <><ArrowDownRight className="mr-1 h-3 w-3" /> Despesa</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-[10px] bg-zinc-900/5 dark:bg-zinc-100/10 px-2 py-1 rounded">
                                                {category.cor}
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground"
                                                    onClick={() => openEditDialog(category)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-rose-500"
                                                    onClick={() => setDeletingId(category.id)}
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
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a categoria
                            e as transações associadas a ela podem ficar sem categoria.
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
