"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    ArrowDownRight,
    ArrowUpRight,
    BrainCircuit,
    CheckCircle2,
    Lightbulb,
    Sparkles,
    Target,
    TriangleAlert,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CategoryPieChart } from "@/features/dashboard/components/category-pie-chart"
import { CashFlowChart } from "@/features/dashboard/components/cash-flow-chart"
import { useInsights, useReport, type Insight } from "@/features/reports/hooks/use-report"
import { cn, formatCurrency, parseLocalDate } from "@/lib/utils"
import { IconTile, PageHeader, StatCard, StatGrid, type Tone } from "@/components/ds"

const PERIODS = [3, 6, 12] as const
type Period = (typeof PERIODS)[number]

const pct = (v: number | null) =>
    v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "good" | "warn" | "bad" | "neutral" }) {
    const map = { good: "success", warn: "warning", bad: "danger", neutral: "neutral" } as const
    return <StatCard label={label} value={value} hint={hint} tone={map[tone]} />
}

const INSIGHT_STYLE: Record<Insight["tipo"], { Icon: typeof CheckCircle2; tone: Tone }> = {
    positivo: { Icon: CheckCircle2, tone: "success" },
    atencao: { Icon: TriangleAlert, tone: "warning" },
    dica: { Icon: Lightbulb, tone: "info" },
}

export default function RelatoriosPage() {
    const [months, setMonths] = React.useState<Period>(6)
    const { data, loading, error } = useReport(months)
    const ai = useInsights()

    const taxa = data?.taxa_poupanca ?? null
    const comp = data?.comprometimento ?? null
    const auto = data?.autonomia_meses ?? null

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                title="Relatórios"
                description={`Saúde financeira dos últimos ${months} meses`}
                actions={
                    <>
                        <div className="flex h-10 rounded-lg border bg-card p-1" role="group" aria-label="Período">
                            {PERIODS.map(p => (
                                <Button
                                    key={p}
                                    size="sm"
                                    variant={months === p ? "secondary" : "ghost"}
                                    aria-pressed={months === p}
                                    className="h-full flex-1 sm:flex-none"
                                    onClick={() => setMonths(p)}
                                >
                                    {p} meses
                                </Button>
                            ))}
                        </div>
                        <Button onClick={() => ai.generate(months)} disabled={ai.loading || loading || !data}>
                            <Sparkles />
                            {ai.loading ? "Analisando..." : ai.insights ? "Gerar nova análise" : "Análise com IA"}
                        </Button>
                    </>
                }
            />

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            {(ai.insights || ai.loading || ai.error) && (
                <Card className="border-brand-2/20 bg-brand-2/5">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <IconTile icon={BrainCircuit} tone="secondary" />
                            <div>
                                <h3 className="font-semibold">Análise da IA</h3>
                                <p className="text-xs text-muted-foreground">Baseada apenas nos totais do período; não substitui orientação profissional.</p>
                            </div>
                        </div>
                        {ai.loading ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                            </div>
                        ) : ai.error ? (
                            <div role="alert" className="text-sm text-destructive">
                                <p>{ai.error}</p>
                                {ai.error.includes("Configurações") && (
                                    <Link href="/configuracoes?tab=ia" className="mt-1 inline-block font-semibold underline">
                                        Configurar modelo de IA
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {ai.insights?.map((insight, i) => {
                                    const style = INSIGHT_STYLE[insight.tipo]
                                    return (
                                        <div key={i} className="flex gap-3 rounded-xl border bg-card p-4">
                                            <IconTile icon={style.Icon} tone={style.tone} size="sm" />
                                            <div className="space-y-1 min-w-0">
                                                <p className="text-sm font-semibold">{insight.titulo}</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{insight.descricao}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {loading && !data ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
            ) : data && (
                <>
                    <StatGrid columns={4}>
                        <Metric
                            label="Resultado do período"
                            value={formatCurrency(data.resultado)}
                            hint={`${formatCurrency(data.receitas)} de receitas − ${formatCurrency(data.despesas)} de despesas`}
                            tone={data.resultado >= 0 ? "good" : "bad"}
                        />
                        <Metric
                            label="Taxa de poupança"
                            value={pct(taxa)}
                            hint="Quanto das receitas sobrou. Referência: 20% ou mais."
                            tone={taxa === null ? "neutral" : taxa >= 20 ? "good" : taxa >= 0 ? "warn" : "bad"}
                        />
                        <Metric
                            label="Comprometimento fixo"
                            value={pct(comp)}
                            hint="Recorrentes e parcelas ÷ receitas. Saudável: até 50%."
                            tone={comp === null ? "neutral" : comp <= 50 ? "good" : comp <= 70 ? "warn" : "bad"}
                        />
                        <Metric
                            label="Autonomia financeira"
                            value={auto === null ? "—" : `${auto.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses`}
                            hint={`Saldo + cofrinhos ÷ despesa média (${formatCurrency(data.despesa_media_mensal)}/mês)`}
                            tone={auto === null ? "neutral" : auto >= 6 ? "good" : auto >= 3 ? "warn" : "bad"}
                        />
                    </StatGrid>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-base">Receitas x despesas por mês</CardTitle>
                                <CardDescription>Por competência (data de vencimento)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[240px] sm:h-[300px] lg:h-[340px]">
                                <CashFlowChart data={data.months} loading={loading} />
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-base">Distribuição de gastos</CardTitle>
                                <CardDescription>Despesas por categoria no período</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[240px] sm:h-[300px] lg:h-[340px]">
                                {data.categorias.length > 0 ? (
                                    <CategoryPieChart data={data.categorias} />
                                ) : (
                                    <p className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem despesas no período.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="overflow-hidden lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base">Maiores categorias de gasto</CardTitle>
                                <CardDescription>Variação: último mês do período vs o anterior</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pt-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-6">Categoria</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">% do total</TableHead>
                                                <TableHead className="px-6 text-right">Variação</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.categorias.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">Sem despesas no período.</TableCell>
                                                </TableRow>
                                            ) : data.categorias.slice(0, 8).map(c => (
                                                <TableRow key={c.name}>
                                                    <TableCell className="px-6 font-semibold">
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || "var(--muted-foreground)" }} />
                                                            {c.name}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold tabular-nums">{formatCurrency(c.value)}</TableCell>
                                                    <TableCell className="text-right text-muted-foreground tabular-nums">
                                                        {pct(data.despesas > 0 ? Math.round((c.value / data.despesas) * 1000) / 10 : null)}
                                                    </TableCell>
                                                    <TableCell className="text-right px-6 tabular-nums">
                                                        {c.variacao === null ? (
                                                            <span className="text-muted-foreground">—</span>
                                                        ) : (
                                                            <span className={cn("inline-flex items-center gap-1 font-bold", c.variacao > 0 ? "text-destructive" : "text-brand-1")}>
                                                                {c.variacao > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                                                {pct(Math.abs(c.variacao))}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">PF x PJ</CardTitle>
                                <CardDescription>Totais do período por perfil</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(["pf", "pj"] as const).map(perfil => {
                                    const r = data.months.reduce((acc, m) => acc + m[perfil].receitas, 0)
                                    const d = data.months.reduce((acc, m) => acc + m[perfil].despesas, 0)
                                    return (
                                        <div key={perfil} className="rounded-xl bg-muted/60 p-4 space-y-2">
                                            <p className="eyebrow">
                                                {perfil === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                                            </p>
                                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Receitas</span><span className="font-bold text-success tabular-nums">{formatCurrency(r)}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Despesas</span><span className="font-bold text-destructive tabular-nums">{formatCurrency(d)}</span></div>
                                            <div className="flex justify-between text-sm border-t border-border pt-2"><span className="text-muted-foreground">Resultado</span><span className={cn("font-bold tabular-nums", r - d >= 0 ? "text-brand-1" : "text-destructive")}>{formatCurrency(r - d)}</span></div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base">Metas dos cofrinhos</CardTitle>
                                <CardDescription>
                                    Total guardado: {formatCurrency(data.total_cofrinhos)}
                                </CardDescription>
                            </div>
                            <Button asChild variant="outline" size="sm"><Link href="/cofrinhos">Ver cofrinhos</Link></Button>
                        </CardHeader>
                        <CardContent>
                            {data.cofrinhos.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Nenhum cofrinho com objetivo definido.</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {data.cofrinhos.map(c => (
                                        <div key={c.nome} className="rounded-xl bg-muted/60 p-4 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-brand-1 shrink-0" />
                                                <p className="font-bold text-sm truncate">{c.nome}</p>
                                                <span className="ml-auto text-xs font-bold tabular-nums">{c.progresso}%</span>
                                            </div>
                                            <Progress value={c.progresso} aria-label={`${c.nome}: ${c.progresso}% da meta`} className="bg-background" indicatorClassName="bg-primary" />
                                            <p className="text-xs text-muted-foreground">
                                                {formatCurrency(c.saldo)} de {formatCurrency(c.objetivo)}
                                                {c.data_prevista && ` · meta para ${format(parseLocalDate(c.data_prevista), "MMM/yyyy", { locale: ptBR })}`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
