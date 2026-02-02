"use client"

import { useState } from "react"
import { Wallet, TrendingUp, Plus, Edit, ArrowDownCircle, ArrowUpCircle, Percent, PiggyBank, ArrowUpRight, TrendingDown, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useCofrinhos, useCofrinhoActions } from "@/features/cofrinhos/hooks/use-cofrinhos"
import { CofrinhoModal } from "@/features/cofrinhos/components/cofrinho-modal"
import { TransactionModal } from "@/features/cofrinhos/components/transaction-modal"
import { Cofrinho } from "@/features/cofrinhos/services/cofrinhos"
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

export default function CofrinhosPage() {
    const { cofrinhos, loading, refresh } = useCofrinhos()
    const { remove } = useCofrinhoActions()

    const [isCofrinhoModalOpen, setIsCofrinhoModalOpen] = useState(false)
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
    const [selectedCofrinho, setSelectedCofrinho] = useState<Cofrinho | undefined>()
    const [transactionType, setTransactionType] = useState<'aporte' | 'resgate'>('aporte')
    const [cofrinhoToDelete, setCofrinhoToDelete] = useState<string | null>(null)

    const handleNewCofrinho = () => {
        setSelectedCofrinho(undefined)
        setIsCofrinhoModalOpen(true)
    }

    const handleEditCofrinho = (cofrinho: Cofrinho) => {
        setSelectedCofrinho(cofrinho)
        setIsCofrinhoModalOpen(true)
    }

    const handleTransaction = (cofrinho: Cofrinho, type: 'aporte' | 'resgate') => {
        setSelectedCofrinho(cofrinho)
        setTransactionType(type)
        setIsTransactionModalOpen(true)
    }

    const handleDelete = async () => {
        if (cofrinhoToDelete) {
            const success = await remove(cofrinhoToDelete)
            if (success) {
                refresh()
            }
            setCofrinhoToDelete(null)
        }
    }

    const totalPatrimonio = cofrinhos.reduce((acc, curr) => acc + Number(curr.saldo_atual), 0)
    const totalMetas = cofrinhos.reduce((acc, curr) => acc + (Number(curr.objetivo) || 0), 0)
    const percentualGeral = totalMetas > 0 ? (totalPatrimonio / totalMetas) * 100 : 0

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reservas e Investimentos</h1>
                    <p className="text-sm text-muted-foreground">Gerencie seus objetivos de longo prazo e liquidez diária</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="bg-zinc-900/5 dark:bg-zinc-100/5 border-none w-full sm:w-auto justify-center">
                        <Percent className="mr-2 h-4 w-4 text-orange-600" />
                        Taxa CDI: 13,15%
                    </Button>
                    <Button
                        onClick={handleNewCofrinho}
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 px-6 w-full sm:w-auto justify-center"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Cofrinho
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Patrimônio em Reservas</p>
                                <h3 className="text-3xl font-bold text-orange-600 tracking-tight">
                                    {loading ? <Skeleton className="h-9 w-32" /> : `R$ ${totalPatrimonio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-[10px] text-muted-foreground">Total alocado em cofrinhos</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-orange-600/10 flex items-center justify-center">
                                <PiggyBank className="h-5 w-5 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Objetivo Total</p>
                                <h3 className="text-3xl font-bold text-emerald-500 tracking-tight">
                                    {loading ? <Skeleton className="h-9 w-32" /> : `R$ ${totalMetas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-[10px] text-emerald-500 font-bold">{percentualGeral.toFixed(1)}% do total concluído</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Previsão 12 Meses</p>
                                <h3 className="text-3xl font-bold text-blue-500 tracking-tight">
                                    {loading ? <Skeleton className="h-9 w-32" /> : `R$ ${(totalPatrimonio * 1.1315).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                </h3>
                                <p className="text-[10px] text-muted-foreground">Baseado na taxa CDI atual</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <ArrowUpRight className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none overflow-hidden">
                            <CardHeader className="pb-4">
                                <Skeleton className="h-12 w-12 rounded-2xl" />
                                <div className="mt-4 space-y-2">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>
                    ))
                ) : cofrinhos.length === 0 ? (
                    <div className="col-span-full py-12 text-center space-y-4 bg-zinc-900/5 dark:bg-zinc-100/5 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="h-16 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mx-auto">
                            <PiggyBank className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Nenhum cofrinho criado</h3>
                            <p className="text-sm text-muted-foreground">Comece a poupar dinheiro criando seu primeiro objetivo.</p>
                        </div>
                        <Button
                            onClick={handleNewCofrinho}
                            variant="outline"
                            className="bg-white dark:bg-zinc-900"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Cofrinho
                        </Button>
                    </div>
                ) : (
                    cofrinhos.map((cofrinho) => {
                        const objetivo = Number(cofrinho.objetivo) || 0
                        const saldo = Number(cofrinho.saldo_atual)
                        const progresso = objetivo > 0 ? Math.min((saldo / objetivo) * 100, 100) : 100

                        return (
                            <Card key={cofrinho.id} className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none overflow-hidden group hover:bg-zinc-900/10 dark:hover:bg-zinc-100/10 transition-all flex flex-col">
                                <CardHeader className="pb-4 flex-row justify-between items-start space-y-0">
                                    <div className="flex flex-col gap-4">
                                        <div
                                            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                            style={{ backgroundColor: cofrinho.cor, boxShadow: `0 10px 15px -3px ${cofrinho.cor}33` }}
                                        >
                                            <Wallet className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold">{cofrinho.nome}</CardTitle>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                {cofrinho.tipo_liquidez === 'diaria' ? '100% CDI - Liquidez Diária' :
                                                    cofrinho.tipo_liquidez === 'fixa' ? 'Prazo Fixo' : 'Indeterminada'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditCofrinho(cofrinho)} className="h-8 w-8 text-muted-foreground"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setCofrinhoToDelete(cofrinho.id)} className="h-8 w-8 text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 flex-1">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Saldo Disponível</p>
                                            <p className="text-3xl font-black" style={{ color: cofrinho.cor }}>
                                                R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-muted-foreground uppercase">Progresso da Meta</span>
                                            <span style={{ color: cofrinho.cor }}>{progresso.toFixed(0)}%</span>
                                        </div>
                                        <Progress value={progresso} className="h-1.5" style={{ backgroundColor: `${cofrinho.cor}1A` }} indicatorClassName="transition-all" indicatorStyle={{ backgroundColor: cofrinho.cor }} />
                                        <p className="text-[10px] text-muted-foreground text-right italic font-medium">
                                            {objetivo > 0 ? `Meta: R$ ${objetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem meta definida'}
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-zinc-900/5 dark:bg-zinc-100/5 p-4 flex gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTransaction(cofrinho, 'aporte')}
                                        className="flex-1 bg-white dark:bg-zinc-900 border-none hover:bg-emerald-500/10 hover:text-emerald-500"
                                    >
                                        <ArrowUpCircle className="mr-2 h-4 w-4" /> Aportar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleTransaction(cofrinho, 'resgate')}
                                        className="flex-1 bg-white dark:bg-zinc-900 border-none hover:bg-rose-500/10 hover:text-rose-500"
                                    >
                                        <ArrowDownCircle className="mr-2 h-4 w-4" /> Resgatar
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })
                )}
            </div>

            <CofrinhoModal
                open={isCofrinhoModalOpen}
                onOpenChange={setIsCofrinhoModalOpen}
                cofrinho={selectedCofrinho}
                onSuccess={refresh}
            />

            {selectedCofrinho && (
                <TransactionModal
                    open={isTransactionModalOpen}
                    onOpenChange={setIsTransactionModalOpen}
                    cofrinho={selectedCofrinho}
                    tipo={transactionType}
                    onSuccess={refresh}
                />
            )}

            <AlertDialog open={!!cofrinhoToDelete} onOpenChange={() => setCofrinhoToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Cofrinho?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todo o histórico de movimentações deste cofrinho será perdido.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

