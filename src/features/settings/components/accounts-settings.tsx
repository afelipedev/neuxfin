"use client"

import * as React from "react"
import { Plus, Landmark, Trash2, Edit, CreditCard, Wallet, Banknote } from "lucide-react"
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
import { settingsService, BankAccount } from "../services/settings-service"
import { toast } from "sonner"

export function AccountsSettings() {
    const [accounts, setAccounts] = React.useState<BankAccount[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [editingAccount, setEditingAccount] = React.useState<BankAccount | null>(null)
    const [formData, setFormData] = React.useState({
        nome: "",
        instituicao: "",
        tipo: "corrente" as BankAccount['tipo'],
        saldo_inicial: 0,
        cor: "#10b981",
    })
    const [deletingId, setDeletingId] = React.useState<string | null>(null)
    const [saving, setSaving] = React.useState(false)

    const fetchAccounts = React.useCallback(async () => {
        try {
            const data = await settingsService.getBankAccounts()
            setAccounts(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchAccounts()
    }, [fetchAccounts])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (editingAccount) {
                await settingsService.updateBankAccount(editingAccount.id, formData)
                toast.success("Conta atualizada", {
                    description: `A conta ${formData.nome} foi atualizada com sucesso.`
                })
            } else {
                await settingsService.createBankAccount(formData)
                toast.success("Conta criada", {
                    description: `A conta ${formData.nome} foi criada com sucesso.`
                })
            }
            setIsDialogOpen(false)
            setEditingAccount(null)
            setFormData({ nome: "", instituicao: "", tipo: "corrente", saldo_inicial: 0, cor: "#10b981" })
            fetchAccounts()
        } catch (error) {
            toast.error(editingAccount ? "Erro ao atualizar conta" : "Erro ao criar conta", {
                description: "Ocorreu um erro ao processar sua solicitação."
            })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return
        try {
            await settingsService.deleteBankAccount(deletingId)
            toast.success("Conta excluída", {
                description: "A conta foi removida com sucesso."
            })
            setDeletingId(null)
            fetchAccounts()
        } catch (error) {
            toast.error("Erro ao excluir", {
                description: "Não foi possível excluir a conta."
            })
        }
    }

    const openEditDialog = (account: BankAccount) => {
        setEditingAccount(account)
        setFormData({
            nome: account.nome,
            instituicao: account.instituicao || "",
            tipo: account.tipo,
            saldo_inicial: account.saldo_inicial,
            cor: account.cor || "#10b981",
        })
        setIsDialogOpen(true)
    }

    const openCreateDialog = () => {
        setEditingAccount(null)
        setFormData({ nome: "", instituicao: "", tipo: "corrente", saldo_inicial: 0, cor: "#10b981" })
        setIsDialogOpen(true)
    }

    const getIcon = (tipo: BankAccount['tipo']) => {
        switch (tipo) {
            case 'corrente': return <Landmark className="h-4 w-4" />
            case 'poupanca': return <Wallet className="h-4 w-4" />
            case 'investimento': return <Landmark className="h-4 w-4" />
            case 'dinheiro': return <Banknote className="h-4 w-4" />
            default: return <Landmark className="h-4 w-4" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Contas Bancárias</h2>
                    <p className="text-sm text-muted-foreground">Gerencie seus bancos, carteiras e investimentos</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <Button onClick={openCreateDialog} className="bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold w-full sm:w-auto justify-center">
                        <Plus className="mr-2 h-4 w-4" /> Nova Conta
                    </Button>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingAccount ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="nome">Nome da Conta / Banco</Label>
                                <Input
                                    id="nome"
                                    placeholder="Ex: Itaú Personalité, Nubank, Carteira..."
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="instituicao">Instituição (opcional)</Label>
                                    <Input
                                        id="instituicao"
                                        placeholder="Ex: Itaú, Bradesco..."
                                        value={formData.instituicao}
                                        onChange={(e) => setFormData({ ...formData, instituicao: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tipo">Tipo de Conta</Label>
                                    <Select
                                        value={formData.tipo}
                                        onValueChange={(val: BankAccount['tipo']) => setFormData({ ...formData, tipo: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                                            <SelectItem value="poupanca">Poupança</SelectItem>
                                            <SelectItem value="investimento">Investimento</SelectItem>
                                            <SelectItem value="dinheiro">Dinheiro (Espécie)</SelectItem>
                                            <SelectItem value="outros">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="saldo">Saldo Inicial</Label>
                                    <Input
                                        id="saldo"
                                        type="number"
                                        step="0.01"
                                        placeholder="0,00"
                                        value={formData.saldo_inicial}
                                        onChange={(e) => setFormData({ ...formData, saldo_inicial: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                    />
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
                            </div>
                            <Button type="submit" disabled={saving} className="w-full bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold">
                                {saving ? "Salvando..." : editingAccount ? "Atualizar Conta" : "Salvar Conta"}
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
                                <TableHead className="font-medium text-xs h-10 px-6">Nome / Instituição</TableHead>
                                <TableHead className="font-medium text-xs h-10">Tipo</TableHead>
                                <TableHead className="font-medium text-xs h-10 text-right">Saldo Inicial</TableHead>
                                <TableHead className="font-medium text-xs h-10 text-right px-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        Carregando contas...
                                    </TableCell>
                                </TableRow>
                            ) : accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                        Nenhuma conta cadastrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accounts.map((account) => (
                                    <TableRow key={account.id} className="border-neux-1/5 hover:bg-zinc-900/5 dark:hover:bg-zinc-100/5 transition-colors">
                                        <TableCell className="font-medium px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                                    style={{ backgroundColor: account.cor || "#10b981" }}
                                                >
                                                    {getIcon(account.tipo)}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{account.nome}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase">{account.instituicao || "Geral"}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-border text-[10px] uppercase font-bold">
                                                {account.tipo}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.saldo_inicial)}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground"
                                                    onClick={() => openEditDialog(account)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-rose-500"
                                                    onClick={() => setDeletingId(account.id)}
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
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a conta bancária
                            e todas as transações associadas a ela podem ficar sem referência.
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
