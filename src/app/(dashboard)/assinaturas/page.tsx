"use client"

import { ExternalLink, Repeat, ShieldCheck, Zap, CreditCard, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useSubscriptions, useSubscriptionStats, useSubscriptionActions } from "@/features/subscriptions/hooks/use-subscriptions"
import { SubscriptionFormModal } from "@/features/subscriptions/components/subscription-form-modal"
import { DeleteSubscriptionDialog } from "@/features/subscriptions/components/delete-subscription-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Subscription } from "@/features/subscriptions/services/subscriptions"

// Função para formatar valor em reais
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}

// Mapeamento de cores para ícones
const iconColors: Record<string, string> = {
    vermelho: 'bg-red-500/10 text-red-600',
    azul: 'bg-blue-500/10 text-blue-600',
    verde: 'bg-emerald-500/10 text-emerald-600',
    amarelo: 'bg-amber-500/10 text-amber-600',
    roxo: 'bg-purple-500/10 text-purple-600',
    rosa: 'bg-pink-500/10 text-pink-600',
    laranja: 'bg-orange-500/10 text-orange-600',
    default: 'bg-indigo-500/10 text-indigo-600',
}

// Mapeamento de bandeiras de cartão
const bandeiraBadgeColors: Record<string, string> = {
    visa: 'bg-blue-500/20 text-blue-600',
    mastercard: 'bg-red-500/20 text-red-600',
    elo: 'bg-yellow-500/20 text-yellow-600',
    amex: 'bg-cyan-500/20 text-cyan-600',
    default: 'bg-gray-500/20 text-gray-600',
}

// Mapeamento de status
const statusConfig: Record<string, { label: string; className: string }> = {
    ativo: { label: 'Ativo', className: 'bg-emerald-500/20 text-emerald-600' },
    pausado: { label: 'Pausado', className: 'bg-amber-500/20 text-amber-600' },
    cancelado: { label: 'Cancelado', className: 'bg-rose-500/20 text-rose-600' },
}

// Mapeamento de frequência
const frequenciaLabels: Record<string, string> = {
    mensal: 'Mensal',
    anual: 'Anual',
    trimestral: 'Trimestral',
    semanal: 'Semanal',
}

function getIconColor(cor: string | null | undefined): string {
    if (!cor) return iconColors.default
    return iconColors[cor.toLowerCase()] || iconColors.default
}

export default function AssinaturasPage() {
    const { subscriptions, loading, refresh } = useSubscriptions()
    const { stats, loading: statsLoading, refresh: refreshStats } = useSubscriptionStats()
    const { generateExpenses, loading: actionLoading } = useSubscriptionActions()

    const handleRefresh = () => {
        refresh()
        refreshStats()
    }

    const handleGenerateExpenses = async () => {
        const currentMonth = new Date().getMonth() + 1
        const currentYear = new Date().getFullYear()
        await generateExpenses(currentMonth, currentYear)
    }

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Assinaturas e Recorrência</h1>
                    <p className="text-sm text-muted-foreground">Gerencie seus serviços, ferramentas e custos fixos mensais</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-zinc-900/5 dark:bg-zinc-100/5 border-none"
                        onClick={handleGenerateExpenses}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Gerar Despesas do Mês
                    </Button>
                    <SubscriptionFormModal onSuccess={handleRefresh} />
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo Mensal Fixo</p>
                                {statsLoading ? (
                                    <Skeleton className="h-9 w-32" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-indigo-500 tracking-tight">
                                        {formatCurrency(stats.custoMensal)}
                                    </h3>
                                )}
                                <p className="text-[10px] text-muted-foreground font-medium">
                                    {stats.totalAtivas} {stats.totalAtivas === 1 ? 'serviço ativo' : 'serviços ativos'}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Repeat className="h-5 w-5 text-indigo-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Segurança Financeira</p>
                                {statsLoading ? (
                                    <Skeleton className="h-9 w-24" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-emerald-500 tracking-tight">
                                        {stats.totalPausadas === 0 && stats.totalCanceladas === 0 ? 'Alta' :
                                            stats.totalPausadas > 0 ? 'Média' : 'Baixa'}
                                    </h3>
                                )}
                                <p className="text-[10px] text-muted-foreground">
                                    {stats.totalPausadas > 0
                                        ? `${stats.totalPausadas} ${stats.totalPausadas === 1 ? 'assinatura pausada' : 'assinaturas pausadas'}`
                                        : 'Nenhuma assinatura em atraso'}
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Custo Anual Estimado</p>
                                {statsLoading ? (
                                    <Skeleton className="h-9 w-32" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-amber-500 tracking-tight">
                                        {formatCurrency(stats.custoMensal * 12)}
                                    </h3>
                                )}
                                <p className="text-[10px] text-muted-foreground">Projeção baseada nos custos mensais</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-amber-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Assinaturas */}
            <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-neux-1/5 px-6 py-4">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">Catálogo de Serviços Recorrentes</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                            Atualizar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-9 w-9 rounded-lg" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-5 w-16" />
                                    <Skeleton className="h-5 w-20" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            ))}
                        </div>
                    ) : subscriptions.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                                <Repeat className="h-8 w-8 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura cadastrada</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                Comece adicionando seus serviços de assinatura para ter controle dos custos fixos.
                            </p>
                            <SubscriptionFormModal onSuccess={handleRefresh} />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-none hover:bg-transparent text-muted-foreground">
                                    <TableHead className="font-medium text-xs h-10 px-6">Serviço / Ferramenta</TableHead>
                                    <TableHead className="font-medium text-xs h-10">Frequência</TableHead>
                                    <TableHead className="font-medium text-xs h-10">Próximo Pagto</TableHead>
                                    <TableHead className="font-medium text-xs h-10">Cartão</TableHead>
                                    <TableHead className="font-medium text-xs h-10">Status</TableHead>
                                    <TableHead className="font-medium text-xs h-10 text-right px-6">Valor</TableHead>
                                    <TableHead className="font-medium text-xs h-10 text-right px-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscriptions.map((subscription) => (
                                    <SubscriptionRow
                                        key={subscription.id}
                                        subscription={subscription}
                                        onRefresh={handleRefresh}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function SubscriptionRow({ subscription, onRefresh }: { subscription: Subscription; onRefresh: () => void }) {
    const statusInfo = statusConfig[subscription.status] || statusConfig.ativo
    const frequenciaLabel = frequenciaLabels[subscription.frequencia] || subscription.frequencia

    // Calcular próximo pagamento
    const hoje = new Date()
    const diaVencimento = subscription.data_vencimento_dia || 1
    let proximoPagamento = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento)

    if (proximoPagamento <= hoje) {
        proximoPagamento = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaVencimento)
    }

    return (
        <TableRow className="border-neux-1/5 hover:bg-zinc-900/5 dark:hover:bg-zinc-100/5 transition-colors">
            <TableCell className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${getIconColor(subscription.cor)}`}>
                        <Repeat className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">{subscription.nome}</p>
                        <p className="text-[10px] text-muted-foreground tracking-tight">
                            {subscription.descricao || subscription.categoria?.nome || 'Sem categoria'}
                        </p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge variant="outline" className="border-none bg-zinc-200 dark:bg-zinc-800 text-[10px]">
                    {frequenciaLabel}
                </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                Todo dia {subscription.data_vencimento_dia || 1}
            </TableCell>
            <TableCell>
                {subscription.cartao ? (
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs">{subscription.cartao.nome}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                )}
            </TableCell>
            <TableCell>
                <Badge className={`${statusInfo.className} border-none text-[10px] h-5`}>
                    {statusInfo.label}
                </Badge>
            </TableCell>
            <TableCell className="text-right font-bold text-zinc-900 dark:text-zinc-100 px-6">
                {formatCurrency(subscription.valor)}
            </TableCell>
            <TableCell className="text-right px-6">
                <div className="flex justify-end gap-1">
                    {subscription.url && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => window.open(subscription.url!, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    )}
                    <SubscriptionFormModal
                        subscription={subscription}
                        onSuccess={onRefresh}
                    />
                    <DeleteSubscriptionDialog
                        subscription={subscription}
                        onSuccess={onRefresh}
                    />
                </div>
            </TableCell>
        </TableRow>
    )
}
