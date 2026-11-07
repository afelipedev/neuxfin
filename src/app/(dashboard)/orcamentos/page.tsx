"use client"

import * as React from "react"
import { Pencil, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Amount,
    EmptyState,
    IconTile,
    MonthStepper,
    PageHeader,
    ProfileBadge,
    SectionCard,
    StatCard,
    StatGrid,
    ToneBadge,
    type Tone,
} from "@/components/ds"
import { cn, formatCurrency } from "@/lib/utils"
import { fromCents, toCents } from "@/features/bank-accounts/services/balances"
import { useBudgetProgress } from "@/features/budgets/hooks/use-budgets"
import { BudgetFormDialog } from "@/features/budgets/components/budget-form-dialog"
import { RemoveBudgetButton } from "@/features/budgets/components/remove-budget-button"
import type { BudgetStatus } from "@/features/budgets/services/budgets"

const STATUS: Record<BudgetStatus, { label: string; tone: Tone; bar: string }> = {
    ok: { label: "No limite", tone: "success", bar: "bg-success" },
    atencao: { label: "Atenção", tone: "warning", bar: "bg-warning" },
    estourado: { label: "Estourado", tone: "danger", bar: "bg-destructive" },
}

export default function BudgetsPage() {
    const [month, setMonth] = React.useState(new Date().getMonth() + 1)
    const [year, setYear] = React.useState(new Date().getFullYear())
    const { progress, loading, error, refresh } = useBudgetProgress(month, year)

    const totals = React.useMemo(() => {
        const limite = progress.reduce((acc, p) => acc + toCents(p.limite), 0)
        const gasto = progress.reduce((acc, p) => acc + toCents(p.gasto), 0)
        return { limite: fromCents(limite), gasto: fromCents(gasto), restante: fromCents(limite - gasto) }
    }, [progress])

    const usedCategoryIds = progress.map(p => p.budget.categoria_id)
    const estourados = progress.filter(p => p.status === "estourado").length

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                title="Orçamentos"
                description="Limite mensal de gastos por categoria"
                actions={
                    <>
                        <MonthStepper month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
                        <BudgetFormDialog usedCategoryIds={usedCategoryIds} onSaved={refresh} />
                    </>
                }
            />

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <StatGrid columns={3}>
                <StatCard label="Orçado no mês" amount={totals.limite} loading={loading} />
                <StatCard label="Gasto nas categorias" amount={totals.gasto} tone="danger" loading={loading} />
                <StatCard
                    label="Restante"
                    amount={totals.restante}
                    tone={totals.restante < 0 ? "danger" : "success"}
                    hint={estourados > 0 ? `${estourados} categoria(s) acima do limite` : undefined}
                    loading={loading}
                />
            </StatGrid>

            <SectionCard title="Por categoria" description="Despesas do mês (competência), pagas ou não, inclusive no cartão">
                {loading ? (
                    <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
                ) : progress.length === 0 ? (
                    <EmptyState
                        icon={Target}
                        title="Nenhum orçamento ainda"
                        description="Defina quanto quer gastar por mês em cada categoria e acompanhe aqui."
                        action={<BudgetFormDialog usedCategoryIds={usedCategoryIds} onSaved={refresh} />}
                    />
                ) : (
                    <ul className="stagger space-y-5">
                        {progress.map(p => {
                            const cfg = STATUS[p.status]
                            const nome = p.budget.categoria?.nome ?? "Categoria"
                            return (
                                <li key={p.budget.id} className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <IconTile icon={Target} color={p.budget.categoria?.cor} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                                                <span className="truncate">{nome}</span>
                                                {p.budget.tipo && <ProfileBadge tipo={p.budget.tipo} />}
                                                <ToneBadge tone={cfg.tone}>{cfg.label}</ToneBadge>
                                            </p>
                                            <p className="text-xs text-muted-foreground tabular-nums">
                                                {formatCurrency(p.gasto)} de {formatCurrency(p.limite)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <Amount value={p.restante} kind="auto" className="text-sm" />
                                            <p className="text-2xs text-muted-foreground">{p.restante < 0 ? "acima" : "restante"}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center">
                                            <BudgetFormDialog
                                                budget={p.budget}
                                                onSaved={refresh}
                                                trigger={
                                                    <Button variant="ghost" size="icon-sm" aria-label={`Editar orçamento de ${nome}`}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                }
                                            />
                                            <RemoveBudgetButton budgetId={p.budget.id} nome={nome} onRemoved={refresh} />
                                        </div>
                                    </div>
                                    <Progress
                                        value={Math.min(p.percentual, 1) * 100}
                                        className="h-2 bg-muted"
                                        indicatorClassName={cn(cfg.bar)}
                                        aria-label={`${Math.round(p.percentual * 100)}% do orçamento de ${nome}`}
                                    />
                                </li>
                            )
                        })}
                    </ul>
                )}
            </SectionCard>
        </div>
    )
}
