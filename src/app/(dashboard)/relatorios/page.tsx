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
import { cn, formatCurrency } from "@/lib/utils"

const PERIODS = [3, 6, 12] as const
type Period = (typeof PERIODS)[number]

const pct = (v: number | null) =>
    v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "good" | "warn" | "bad" | "neutral" }) {
    const color = { good: "text-brand-1", warn: "text-amber-500", bad: "text-rose-500", neutral: "text-foreground" }[tone]
    return (
        <Card className="border-none glass-card">
            <CardContent className="p-6 space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className={cn("text-3xl font-black tracking-tighter font-display tabular-nums", color)}>{value}</p>
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            </CardContent>
        </Card>
    )
}

const INSIGHT_STYLE: Record<Insight["tipo"], { Icon: typeof CheckCircle2; className: string }> = {
    positivo: { Icon: CheckCircle2, className: "bg-brand-1/10 text-brand-1" },
    atencao: { Icon: TriangleAlert, className: "bg-amber-500/10 text-amber-500" },
    dica: { Icon: Lightbulb, className: "bg-sky-500/10 text-sky-500" },
}

export default function RelatoriosPage() {
    const [months, setMonths] = React.useState<Period>(6)
    const { data, loading, error } = useReport(months)
    const ai = useInsights()

    const taxa = data?.taxa_poupanca ?? null
    const comp = data?.comprometimento ?? null
    const auto = data?.autonomia_meses ?? null

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter font-display">Relatórios</h1>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">
                        Saúde financeira dos últimos {months} meses
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <div className="flex rounded-xl border border-border bg-secondary/30 p-1" role="group" aria-label="Período">
                        {PERIODS.map(p => (
                            <Button
                                key={p}
                                size="sm"
                                variant={months === p ? "default" : "ghost"}
                                aria-pressed={months === p}
                                className="h-8 flex-1 sm:flex-none text-xs"
                                onClick={() => setMonths(p)}
                            >
                                {p} meses
                            </Button>
                        ))}
                    </div>
                    <Button
                        onClick={() => ai.generate(months)}
                        disabled={ai.loading || loading || !data}
                        className="bg-brand-1 hover:bg-brand-2 text-zinc-950 font-bold w-full sm:w-auto"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {ai.loading ? "Analisando..." : ai.insights ? "Gerar nova análise" : "Análise com IA"}
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            {(ai.insights || ai.loading || ai.error) && (
                <Card className="border-none bg-gradient-to-r from-brand-1/10 via-brand-1/5 to-transparent shadow-none">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-brand-1 flex items-center justify-center shrink-0">
                                <BrainCircuit className="h-5 w-5 text-zinc-950" />
                            </div>
                            <div>
                                <h3 className="font-bold">Análise da IA</h3>
                                <p className="text-xs text-muted-foreground">Baseada apenas nos totais do período; não substitui orientação profissional.</p>
                            </div>
                        </div>
                        {ai.loading ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                            </div>
                        ) : ai.error ? (
                            <div className="text-sm text-rose-500">
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
                                        <div key={i} className="flex gap-3 rounded-2xl bg-background/60 p-4">
                                            <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", style.className)}>
                                                <style.Icon className="h-4 w-4" />
                                            </span>
                                            <div className="space-y-1 min-w-0">
                                                <p className="text-sm font-bold">{insight.titulo}</p>
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
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
                </div>
            ) : data && (
                <>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="border-none glass-card shadow-none overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-base font-bold">Receitas x despesas por mês</CardTitle>
                                <CardDescription>Por competência (data de vencimento)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[260px] sm:h-[320px] lg:h-[350px]">
                                <CashFlowChart data={data.months} loading={loading} />
                            </CardContent>
                        </Card>

                        <Card className="border-none glass-card shadow-none overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-base font-bold">Distribuição de gastos</CardTitle>
                                <CardDescription>Despesas por categoria no período</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[260px] sm:h-[320px] lg:h-[350px]">
                                {data.categorias.length > 0 ? (
                                    <CategoryPieChart data={data.categorias} />
                                ) : (
                                    <p className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem despesas no período.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card className="border-none glass-card shadow-none overflow-hidden lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-base font-bold">Maiores categorias de gasto</CardTitle>
                                <CardDescription>Variação: último mês do período vs o anterior</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pt-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest">Categoria</TableHead>
                                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Total</TableHead>
                                                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">% do total</TableHead>
                                                <TableHead className="text-right px-6 text-[10px] font-black uppercase tracking-widest">Variação</TableHead>
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
                                                            <span className={cn("inline-flex items-center gap-1 font-bold", c.variacao > 0 ? "text-rose-500" : "text-brand-1")}>
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

                        <Card className="border-none glass-card shadow-none">
                            <CardHeader>
                                <CardTitle className="text-base font-bold">PF x PJ</CardTitle>
                                <CardDescription>Totais do período por perfil</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(["pf", "pj"] as const).map(perfil => {
                                    const r = data.months.reduce((acc, m) => acc + m[perfil].receitas, 0)
                                    const d = data.months.reduce((acc, m) => acc + m[perfil].despesas, 0)
                                    return (
                                        <div key={perfil} className="rounded-2xl bg-secondary/40 p-4 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                {perfil === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}
                                            </p>
                                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Receitas</span><span className="font-bold text-brand-2 tabular-nums">{formatCurrency(r)}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Despesas</span><span className="font-bold text-rose-500 tabular-nums">{formatCurrency(d)}</span></div>
                                            <div className="flex justify-between text-sm border-t border-border pt-2"><span className="text-muted-foreground">Resultado</span><span className={cn("font-black tabular-nums", r - d >= 0 ? "text-brand-1" : "text-rose-500")}>{formatCurrency(r - d)}</span></div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-none glass-card shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold">Metas dos cofrinhos</CardTitle>
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
                                        <div key={c.nome} className="rounded-2xl bg-secondary/40 p-4 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-brand-1 shrink-0" />
                                                <p className="font-bold text-sm truncate">{c.nome}</p>
                                                <span className="ml-auto text-xs font-black tabular-nums">{c.progresso}%</span>
                                            </div>
                                            <Progress value={c.progresso} aria-label={`${c.nome}: ${c.progresso}% da meta`} className="bg-secondary" indicatorClassName="bg-brand-1" />
                                            <p className="text-[11px] text-muted-foreground">
                                                {formatCurrency(c.saldo)} de {formatCurrency(c.objetivo)}
                                                {c.data_prevista && ` · meta para ${format(new Date(c.data_prevista), "MMM/yyyy", { locale: ptBR })}`}
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
