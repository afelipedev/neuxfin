import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Wallet, ArrowUp, ArrowDown, Plus, CheckCircle2, CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn, formatCurrency, parseLocalDate } from "@/lib/utils"
import type { DashboardStats } from "@/features/transactions/services/transactions"
import { todayISO } from "@/features/bank-accounts/services/balances"
import type { AlertLevel, HealthAlert, UpcomingItem } from "../services/dashboard-alerts"

interface StatsProps {
    stats: DashboardStats
    loading?: boolean
}

export function SummaryCards({ stats, loading }: StatsProps) {
    if (loading) {
        return (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="border-none glass-card animate-pulse h-32" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none glass-card glow-primary overflow-hidden group hover:shadow-2xl hover:shadow-brand-1/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-5 sm:p-6 relative">
                    <div className="absolute right-4 top-4 h-10 w-10 rounded-xl bg-brand-1/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-1 group-hover:text-zinc-950 shadow-lg shadow-brand-1/20 transition-all duration-500">
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 pr-14">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
                        <h3 className="text-[clamp(1.4rem,2.3vw,1.875rem)] font-black text-brand-1 tracking-tighter leading-none font-display tabular-nums whitespace-nowrap">
                            {formatCurrency(stats.saldo_atual)}
                        </h3>
                        <p className="text-[10px] text-muted-foreground/50 font-medium font-body uppercase tracking-tighter">
                            Soma das contas hoje
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none glass-card overflow-hidden group hover:shadow-2xl hover:shadow-brand-2/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-5 sm:p-6 relative">
                    <div className="absolute right-4 top-4 h-10 w-10 rounded-xl bg-brand-2/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-2 group-hover:text-zinc-950 shadow-lg shadow-brand-2/20 transition-all duration-500">
                        <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 pr-14">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Receitas do Mês</p>
                        <h3 className="text-[clamp(1.4rem,2.3vw,1.875rem)] font-black text-brand-2 tracking-tighter leading-none font-display tabular-nums whitespace-nowrap">
                            {formatCurrency(stats.total_receitas)}
                        </h3>
                        <p className="text-[10px] text-muted-foreground/50 font-medium font-body uppercase tracking-tighter">Recebido {formatCurrency(stats.total_receitas_recebidas)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none glass-card overflow-hidden group hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-5 sm:p-6 relative">
                    <div className="absolute right-4 top-4 h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white shadow-lg shadow-rose-500/20 transition-all duration-500">
                        <ArrowDownRight className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 pr-14">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Despesas Pagas</p>
                        <h3 className="text-[clamp(1.4rem,2.3vw,1.875rem)] font-black text-rose-500 tracking-tighter leading-none font-display tabular-nums whitespace-nowrap">
                            {formatCurrency(stats.total_despesas_pagas)}
                        </h3>
                        <p className="text-[10px] text-muted-foreground/50 font-medium font-body uppercase tracking-tighter">De {formatCurrency(stats.total_despesas)} no mês</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none glass-card overflow-hidden group hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-5 sm:p-6 relative">
                    <div className="absolute right-4 top-4 h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white shadow-lg shadow-amber-500/20 transition-all duration-500">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 pr-14">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Despesas Pendentes</p>
                        <h3 className="text-[clamp(1.4rem,2.3vw,1.875rem)] font-black text-amber-500 tracking-tighter leading-none font-display tabular-nums whitespace-nowrap">
                            {formatCurrency(stats.total_despesas_pendentes)}
                        </h3>
                        <p className={cn(
                            "text-[10px] font-medium font-body uppercase tracking-tighter",
                            stats.total_despesas_atrasadas > 0 ? "text-rose-500" : "text-muted-foreground/50"
                        )}>
                            {stats.total_despesas_atrasadas > 0
                                ? `${formatCurrency(stats.total_despesas_atrasadas)} em atraso`
                                : "Total a pagar"}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function QuickBalanceDetail({ stats }: StatsProps) {
    const positivo = stats.saldo_atual >= 0

    return (
        <Card className="border-none glass-card bg-gradient-to-br from-secondary/30 to-brand-1/5 dark:from-white/5 dark:to-brand-1/5 overflow-hidden shadow-2xl shadow-brand-1/5 transition-all duration-300">
            <CardContent className="p-5 sm:p-6 space-y-6">
                <div className="flex justify-between items-center gap-3">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Disponível Hoje</h4>
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter shrink-0",
                        positivo ? "bg-brand-1/10 text-brand-1" : "bg-rose-500/10 text-rose-500"
                    )}>
                        {positivo ? "Positivo" : "Negativo"}
                    </span>
                </div>

                <h3 className={cn(
                    "text-3xl sm:text-4xl font-black tracking-tighter leading-none font-display tabular-nums break-words",
                    positivo ? "text-brand-1" : "text-rose-500"
                )}>
                    {formatCurrency(stats.saldo_atual)}
                </h3>

                <div className="space-y-3 pt-4 border-t border-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/50">Previsão até o fim do mês</p>
                    <div className="flex justify-between gap-3 text-[11px] font-semibold">
                        <span className="text-muted-foreground/60 min-w-0">+ A receber:</span>
                        <span className="text-brand-2 font-bold font-body tabular-nums">{formatCurrency(stats.receitas_a_receber)}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-[11px] font-semibold">
                        <span className="text-muted-foreground/60 min-w-0">− A pagar (inclui atrasadas):</span>
                        <span className="text-amber-500 font-bold font-body tabular-nums">{formatCurrency(stats.despesas_a_pagar)}</span>
                    </div>
                    {stats.faturas_a_pagar > 0 && (
                        <div className="flex justify-between gap-3 text-[11px] font-semibold">
                            <span className="text-muted-foreground/60 min-w-0">− Faturas de cartão:</span>
                            <span className="text-amber-500 font-bold font-body tabular-nums">{formatCurrency(stats.faturas_a_pagar)}</span>
                        </div>
                    )}
                    <div className="flex justify-between gap-3 pt-2 text-xs font-black border-t border-border">
                        <span className="uppercase tracking-widest text-[10px] text-foreground/50">= Saldo previsto:</span>
                        <span className={cn("tabular-nums", stats.saldo_previsto >= 0 ? "text-brand-1" : "text-rose-500")}>
                            {formatCurrency(stats.saldo_previsto)}
                        </span>
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground/50">Resultado do mês</p>
                    <div className="flex justify-between gap-3 text-[11px] font-semibold">
                        <span className="text-muted-foreground/60 min-w-0">Receitas:</span>
                        <span className="text-brand-2 font-bold font-body tabular-nums">{formatCurrency(stats.total_receitas)}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-[11px] font-semibold">
                        <span className="text-muted-foreground/60 min-w-0">Despesas:</span>
                        <span className="text-rose-500 font-bold font-body tabular-nums">{formatCurrency(stats.total_despesas)}</span>
                    </div>
                    <div className="flex justify-between gap-3 pt-2 text-xs font-black border-t border-border">
                        <span className="uppercase tracking-widest text-[10px] text-foreground/50">Resultado:</span>
                        <span className={cn("tabular-nums", stats.resultado_mes >= 0 ? "text-brand-1" : "text-rose-500")}>
                            {formatCurrency(stats.resultado_mes)}
                        </span>
                    </div>
                </div>

                {stats.transacoes_pagas_sem_conta > 0 && (
                    <div className="flex gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p>
                            {stats.transacoes_pagas_sem_conta} lançamento(s) pago(s) sem conta bancária não entram no saldo.
                            Edite-os e vincule uma conta.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}


const UPCOMING_LIMIT = 6

export function UpcomingPayments({ items, loading }: { items: UpcomingItem[]; loading?: boolean }) {
    const visible = items.slice(0, UPCOMING_LIMIT)
    const today = todayISO()

    return (
        <Card className="border-none glass-card transition-all duration-300">
            <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Próximos Vencimentos</CardTitle>
                    <span className="text-[10px] text-muted-foreground/60 font-semibold">7 dias + atrasados</span>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl bg-secondary/50 animate-pulse" />)}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="min-h-[100px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-5 w-5 text-brand-1" />
                        <p className="text-[11px] font-semibold">Nada vencendo nos próximos 7 dias</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {visible.map(item => {
                            const Icon = item.kind === 'fatura' ? CreditCard : item.kind === 'receita' ? ArrowUp : ArrowDown
                            const quando = item.atrasado
                                ? 'Atrasado'
                                : item.vencimento === today
                                    ? 'Vence hoje'
                                    : format(parseLocalDate(item.vencimento), "dd 'de' MMM", { locale: ptBR })
                            return (
                                <li key={item.id}>
                                    <Link
                                        href={item.href}
                                        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary/60 transition-colors"
                                    >
                                        <span className={cn(
                                            "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center",
                                            item.kind === 'receita' ? "bg-brand-2/10 text-brand-2" : "bg-rose-500/10 text-rose-500"
                                        )}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[12px] font-bold text-foreground">{item.descricao}</span>
                                            <span className={cn(
                                                "block text-[10px] font-semibold",
                                                item.atrasado ? "text-rose-500" : "text-muted-foreground"
                                            )}>{quando}</span>
                                        </span>
                                        <span className={cn(
                                            "text-[12px] font-black tabular-nums shrink-0",
                                            item.kind === 'receita' ? "text-brand-2" : "text-foreground"
                                        )}>
                                            {formatCurrency(item.valor)}
                                        </span>
                                    </Link>
                                </li>
                            )
                        })}
                        {items.length > UPCOMING_LIMIT && (
                            <li className="pt-1 text-center text-[10px] text-muted-foreground font-semibold">
                                + {items.length - UPCOMING_LIMIT} outro(s)
                            </li>
                        )}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}

const ALERT_STYLE: Record<AlertLevel, { box: string; text: string; Icon: typeof AlertTriangle }> = {
    critico: { box: "bg-rose-500/5 border-rose-500/15", text: "text-rose-600 dark:text-rose-400", Icon: AlertTriangle },
    atencao: { box: "bg-amber-500/5 border-amber-500/15", text: "text-amber-600 dark:text-amber-400", Icon: AlertTriangle },
    ok: { box: "bg-brand-1/5 border-brand-1/15", text: "text-brand-1", Icon: CheckCircle2 },
}

export function AlertCard({ alerts, loading }: { alerts: HealthAlert[]; loading?: boolean }) {
    const criticos = alerts.filter(a => a.level === 'critico').length

    return (
        <Card className="border-none glass-card transition-all duration-300">
            <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Alertas de Saúde</CardTitle>
                    {criticos > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] h-5 px-2 rounded-full font-black flex items-center">
                            {criticos} {criticos === 1 ? 'Crítico' : 'Críticos'}
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-2">
                {loading ? (
                    <div className="h-16 rounded-2xl bg-secondary/50 animate-pulse" />
                ) : alerts.length === 0 ? (
                    <div className="flex items-center gap-2 p-4 rounded-2xl bg-brand-1/5 border border-brand-1/15 text-brand-1">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <p className="text-[11px] font-semibold">Nenhum alerta no momento.</p>
                    </div>
                ) : alerts.map(alert => {
                    const style = ALERT_STYLE[alert.level]
                    const content = (
                        <>
                            <div className="flex items-center gap-2">
                                <style.Icon className={cn("h-4 w-4 shrink-0", style.text)} />
                                <h5 className={cn("text-[10px] font-black uppercase tracking-widest", style.text)}>{alert.titulo}</h5>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">{alert.descricao}</p>
                        </>
                    )
                    const className = cn("block p-4 rounded-2xl border space-y-1.5 transition-colors", style.box)
                    return alert.href ? (
                        <Link key={alert.id} href={alert.href} className={cn(className, "hover:brightness-95 dark:hover:brightness-125")}>
                            {content}
                        </Link>
                    ) : (
                        <div key={alert.id} className={className}>{content}</div>
                    )
                })}
            </CardContent>
        </Card>
    )
}

export function QuickActions({ onAddReceita, onAddDespesa }: { onAddReceita?: () => void, onAddDespesa?: () => void }) {
    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Ações Rápidas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                    variant="outline"
                    onClick={onAddReceita}
                    className="h-28 flex flex-col gap-3 glass-card border-none hover:bg-brand-1 hover:text-zinc-950 transition-all duration-500 group rounded-[1.5rem] cursor-pointer active:scale-95 shadow-lg hover:shadow-brand-1/20 dark:text-foreground"
                >
                    <div className="h-10 w-10 rounded-xl bg-brand-1/10 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-brand-1 transition-all">
                        <Plus className="h-6 w-6 transition-transform group-hover:scale-110" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Receita</span>
                </Button>
                <Button
                    variant="outline"
                    onClick={onAddDespesa}
                    className="h-28 flex flex-col gap-3 glass-card border-none hover:bg-rose-500 hover:text-white transition-all duration-500 group rounded-[1.5rem] cursor-pointer active:scale-95 shadow-lg hover:shadow-rose-500/20 dark:text-foreground"
                >
                    <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:bg-white group-hover:text-rose-500 transition-all">
                        <Wallet className="h-6 w-6 transition-transform group-hover:scale-110" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Despesa</span>
                </Button>
            </div>
        </div>
    )
}
