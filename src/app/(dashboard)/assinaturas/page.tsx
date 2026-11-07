"use client"

import { DataTablePagination, usePaginatedList } from "@/components/data-table-pagination"
import { CreditCard, ExternalLink, Landmark, Loader2, RefreshCw, Repeat, ShieldCheck, Zap } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { EmptyState, IconTile, PageHeader, SectionCard, StatCard, StatGrid, ToneBadge, type Tone } from "@/components/ds"
import { useSubscriptions, useSubscriptionStats, useSubscriptionActions } from "@/features/subscriptions/hooks/use-subscriptions"
import { SubscriptionFormModal } from "@/features/subscriptions/components/subscription-form-modal"
import { DeleteSubscriptionDialog } from "@/features/subscriptions/components/delete-subscription-dialog"
import { Subscription } from "@/features/subscriptions/services/subscriptions"
import { formatCurrency, parseLocalDate } from "@/lib/utils"

/** Cor nomeada da assinatura → tom do design system */
const COLOR_TONE: Record<string, Tone> = {
    vermelho: "danger",
    azul: "info",
    verde: "success",
    amarelo: "warning",
    roxo: "secondary",
    rosa: "danger",
    laranja: "tertiary",
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
    ativo: { label: "Ativo", tone: "success" },
    pausado: { label: "Pausado", tone: "warning" },
    cancelado: { label: "Cancelado", tone: "danger" },
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

const FREQUENCIA: Record<string, string> = {
    mensal: "Mensal",
    anual: "Anual",
    trimestral: "Trimestral",
    semanal: "Semanal",
}

/** Quando a assinatura cobra, conforme a frequência e a data de início. */
function vencimentoLabel(sub: Subscription): string {
    const inicio = parseLocalDate(sub.data_inicio)
    const dia = sub.data_vencimento_dia ?? inicio.getDate()
    switch (sub.frequencia) {
        case "semanal": return `Toda semana desde ${format(inicio, "dd/MM")}`
        case "anual": return `Todo ano em ${dia} de ${MESES[inicio.getMonth()]}`
        case "trimestral": return `A cada 3 meses, dia ${dia}`
        default: return `Todo dia ${dia}`
    }
}

const toneOf = (cor: string | null | undefined): Tone => COLOR_TONE[cor?.toLowerCase() ?? ""] ?? "secondary"

export default function AssinaturasPage() {
    const { subscriptions, loading, refresh } = useSubscriptions()
    const paged = usePaginatedList(subscriptions, 10)
    const { stats, loading: statsLoading, refresh: refreshStats } = useSubscriptionStats()
    const { generateExpenses, loading: actionLoading } = useSubscriptionActions()

    const handleRefresh = () => {
        refresh()
        refreshStats()
    }

    const handleGenerateExpenses = async () => {
        const now = new Date()
        await generateExpenses(now.getMonth() + 1, now.getFullYear())
    }

    const seguranca = stats.totalPausadas === 0 && stats.totalCanceladas === 0 ? "Alta" : stats.totalPausadas > 0 ? "Média" : "Baixa"

    const rowActions = (sub: Subscription) => (
        <div className="flex justify-end gap-1">
            {sub.url && (
                <Button asChild variant="ghost" size="icon-sm" className="text-muted-foreground">
                    <a href={sub.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir site de ${sub.nome}`}>
                        <ExternalLink />
                    </a>
                </Button>
            )}
            <SubscriptionFormModal subscription={sub} onSuccess={handleRefresh} />
            <DeleteSubscriptionDialog subscription={sub} onSuccess={handleRefresh} />
        </div>
    )

    const pagamento = (sub: Subscription) =>
        sub.cartao ? (
            <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3 w-3" aria-hidden="true" />{sub.cartao.nome}</span>
        ) : (
            <span className="inline-flex items-center gap-1.5"><Landmark className="h-3 w-3" aria-hidden="true" />{sub.conta?.nome ?? "Conta padrão"}</span>
        )

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                title="Assinaturas"
                description="Serviços, ferramentas e custos fixos recorrentes"
                actions={
                    <>
                        <Button variant="outline" onClick={handleGenerateExpenses} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            Gerar despesas do mês
                        </Button>
                        <SubscriptionFormModal onSuccess={handleRefresh} />
                    </>
                }
            />

            <StatGrid columns={3}>
                <StatCard
                    label="Custo mensal fixo"
                    amount={stats.custoMensal}
                    hint={`${stats.totalAtivas} ${stats.totalAtivas === 1 ? "serviço ativo" : "serviços ativos"}`}
                    icon={Repeat}
                    tone="secondary"
                    loading={statsLoading}
                />
                <StatCard
                    label="Segurança financeira"
                    value={seguranca}
                    hint={stats.totalPausadas > 0
                        ? `${stats.totalPausadas} ${stats.totalPausadas === 1 ? "assinatura pausada" : "assinaturas pausadas"}`
                        : "Nenhuma assinatura pausada"}
                    icon={ShieldCheck}
                    tone={seguranca === "Alta" ? "success" : seguranca === "Média" ? "warning" : "danger"}
                    loading={statsLoading}
                />
                <StatCard
                    label="Custo anual estimado"
                    amount={stats.custoMensal * 12}
                    hint="Projeção baseada nos custos mensais"
                    icon={Zap}
                    tone="warning"
                    loading={statsLoading}
                />
            </StatGrid>

            <SectionCard
                flush
                className="pb-0"
                title="Serviços recorrentes"
                actions={
                    <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        Atualizar
                    </Button>
                }
            >
                {loading ? (
                    <div className="space-y-3 px-4 pb-5 sm:px-6">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                    </div>
                ) : subscriptions.length === 0 ? (
                    <EmptyState
                        icon={Repeat}
                        tone="secondary"
                        title="Nenhuma assinatura cadastrada"
                        description="Adicione seus serviços de assinatura para ter controle dos custos fixos."
                        action={<SubscriptionFormModal onSuccess={handleRefresh} />}
                    />
                ) : (
                    <>
                        {/* Mobile */}
                        <ul className="stagger divide-y border-t md:hidden">
                            {paged.pageItems.map(sub => {
                                const status = STATUS[sub.status] ?? STATUS.ativo
                                return (
                                    <li key={sub.id} className="space-y-2 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <IconTile icon={Repeat} tone={toneOf(sub.cor)} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium">{sub.nome}</p>
                                                <p className="truncate text-xs text-muted-foreground">{vencimentoLabel(sub)}</p>
                                            </div>
                                            <span className="font-semibold tabular-nums">{formatCurrency(sub.valor)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
                                                <ToneBadge>{FREQUENCIA[sub.frequencia] ?? sub.frequencia}</ToneBadge>
                                                {pagamento(sub)}
                                            </div>
                                            <div className="-mr-2 shrink-0">{rowActions(sub)}</div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>

                        {/* Desktop */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6">Serviço</TableHead>
                                        <TableHead>Frequência</TableHead>
                                        <TableHead className="hidden lg:table-cell">Cobrança</TableHead>
                                        <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="px-6 text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paged.pageItems.map(sub => {
                                        const status = STATUS[sub.status] ?? STATUS.ativo
                                        return (
                                            <TableRow key={sub.id}>
                                                <TableCell className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <IconTile icon={Repeat} tone={toneOf(sub.cor)} size="sm" />
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium">{sub.nome}</p>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {sub.descricao || sub.categoria?.nome || "Sem categoria"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell><ToneBadge>{FREQUENCIA[sub.frequencia] ?? sub.frequencia}</ToneBadge></TableCell>
                                                <TableCell className="hidden text-muted-foreground lg:table-cell">{vencimentoLabel(sub)}</TableCell>
                                                <TableCell className="hidden text-muted-foreground lg:table-cell">{pagamento(sub)}</TableCell>
                                                <TableCell><ToneBadge tone={status.tone}>{status.label}</ToneBadge></TableCell>
                                                <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(sub.valor)}</TableCell>
                                                <TableCell className="px-6">{rowActions(sub)}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <DataTablePagination
                            page={paged.page}
                            pageSize={paged.pageSize}
                            totalCount={paged.totalCount}
                            onPageChange={paged.setPage}
                            onPageSizeChange={paged.setPageSize}
                        />
                    </>
                )}
            </SectionCard>
        </div>
    )
}
