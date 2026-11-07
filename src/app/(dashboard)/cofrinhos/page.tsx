"use client"

import { useState } from "react"
import {
    Wallet,
    TrendingUp,
    Plus,
    Edit,
    ArrowDownCircle,
    ArrowUpCircle,
    Percent,
    PiggyBank,
    ArrowUpRight,
    Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { EmptyState, IconTile, PageHeader, StatCard, StatGrid } from "@/components/ds"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useCofrinhos, useCofrinhoActions, useCdiRate } from "@/features/cofrinhos/hooks/use-cofrinhos"
import { projectSavings } from "@/features/cofrinhos/services/projection"
import Link from "next/link"
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
import { formatCurrency } from "@/lib/utils"

export default function CofrinhosPage() {
    const { cofrinhos, loading, refresh } = useCofrinhos()
    const { remove } = useCofrinhoActions()
    const { cdi, loading: loadingCdi } = useCdiRate()

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
    // Previsão de 12 meses com o CDI configurado em Configurações → Perfil
    const projecao = projectSavings(totalPatrimonio, cdi)
    const cdiLabel = cdi.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                title="Cofrinhos"
                description="Reservas e objetivos de longo prazo com liquidez diária"
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href="/configuracoes?tab=perfil" title="Alterar a taxa CDI no perfil">
                                <Percent className="text-brand-3" />
                                {loadingCdi ? <Skeleton className="h-4 w-20" /> : <>CDI {cdiLabel}% a.a.</>}
                            </Link>
                        </Button>
                        <Button onClick={handleNewCofrinho}>
                            <Plus /> Novo cofrinho
                        </Button>
                    </>
                }
            />

            <StatGrid columns={3}>
                <StatCard label="Patrimônio em reservas" amount={totalPatrimonio} hint="Total alocado em cofrinhos" icon={PiggyBank} tone="tertiary" loading={loading} />
                <StatCard
                    label="Objetivo total"
                    amount={totalMetas}
                    hint={`${percentualGeral.toFixed(1)}% do total concluído`}
                    icon={TrendingUp}
                    tone="success"
                    loading={loading}
                />
                <StatCard
                    label="Previsão 12 meses"
                    amount={projecao.projetado}
                    hint={loading || loadingCdi
                        ? "Calculando com o seu CDI..."
                        : <>+{formatCurrency(projecao.rendimento)} a 100% do CDI de {cdiLabel}% a.a., sem novos aportes. <Link href="/configuracoes?tab=perfil" className="font-medium underline underline-offset-2">Alterar taxa</Link></>}
                    icon={ArrowUpRight}
                    tone="info"
                    loading={loading || loadingCdi}
                />
            </StatGrid>

            <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)
                ) : cofrinhos.length === 0 ? (
                    <Card className="col-span-full border-dashed">
                        <EmptyState
                            icon={PiggyBank}
                            tone="tertiary"
                            title="Nenhum cofrinho criado"
                            description="Comece a poupar criando seu primeiro objetivo."
                            action={<Button onClick={handleNewCofrinho}><Plus /> Criar primeiro cofrinho</Button>}
                        />
                    </Card>
                ) : (
                    cofrinhos.map((cofrinho) => {
                        const objetivo = Number(cofrinho.objetivo) || 0
                        const saldo = Number(cofrinho.saldo_atual)
                        const progresso = objetivo > 0 ? Math.min((saldo / objetivo) * 100, 100) : 0

                        return (
                            <Card key={cofrinho.id} className="gap-5 pb-0">
                                <CardHeader className="flex flex-row items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <IconTile icon={Wallet} color={cofrinho.cor} size="lg" />
                                        <div className="min-w-0">
                                            <CardTitle className="truncate text-base">{cofrinho.nome}</CardTitle>
                                            <p className="text-xs text-muted-foreground">
                                                {cofrinho.tipo_liquidez === 'diaria' ? '100% CDI · Liquidez diária' :
                                                    cofrinho.tipo_liquidez === 'fixa' ? 'Prazo fixo' : 'Indeterminada'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="-mr-2 flex shrink-0">
                                        <Button variant="ghost" size="icon-sm" onClick={() => handleEditCofrinho(cofrinho)} aria-label={`Editar ${cofrinho.nome}`} className="text-muted-foreground"><Edit /></Button>
                                        <Button variant="ghost" size="icon-sm" onClick={() => setCofrinhoToDelete(cofrinho.id)} aria-label={`Excluir ${cofrinho.nome}`} className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    <div>
                                        <p className="eyebrow">Saldo disponível</p>
                                        <p className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{formatCurrency(saldo)}</p>
                                    </div>
                                    {objetivo > 0 ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Progresso da meta</span>
                                            <span className="font-semibold tabular-nums">{progresso.toFixed(0)}%</span>
                                        </div>
                                        <Progress
                                            value={progresso}
                                            aria-label={`${cofrinho.nome}: ${progresso.toFixed(0)}% da meta`}
                                            className="h-2 bg-muted"
                                            indicatorStyle={{ backgroundColor: cofrinho.cor }}
                                        />
                                        <p className="text-right text-xs text-muted-foreground">Meta: {formatCurrency(objetivo)}</p>
                                    </div>
                                    ) : (
                                        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                                            Sem meta definida. <button type="button" onClick={() => handleEditCofrinho(cofrinho)} className="font-medium text-brand-1 underline-offset-4 hover:underline">Definir meta</button>
                                        </p>
                                    )}
                                </CardContent>
                                <CardFooter className="grid grid-cols-2 gap-2 border-t bg-muted/40 px-4 py-3">
                                    <Button variant="outline" size="sm" onClick={() => handleTransaction(cofrinho, 'aporte')} className="hover:text-success">
                                        <ArrowUpCircle /> Aportar
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleTransaction(cofrinho, 'resgate')} className="hover:text-destructive">
                                        <ArrowDownCircle /> Resgatar
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
                        <AlertDialogTitle>Excluir cofrinho?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Todo o histórico de movimentações deste cofrinho será perdido.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

