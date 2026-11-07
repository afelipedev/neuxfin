import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertTriangle, ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, CheckCircle2, CreditCard, Wallet } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Amount, IconTile, SectionCard, StatCard, StatGrid, TONE, ToneBadge, type Tone } from "@/components/ds"
import { cn, formatCurrency, parseLocalDate } from "@/lib/utils"
import type { DashboardStats } from "@/features/transactions/services/transactions"
import { todayISO } from "@/features/bank-accounts/services/balances"
import type { AlertLevel, HealthAlert, UpcomingItem } from "../services/dashboard-alerts"

interface StatsProps {
    stats: DashboardStats
    loading?: boolean
}

/** KPIs do mês. Cada card leva à página que detalha o número. */
export function SummaryCards({ stats, loading }: StatsProps) {
    return (
        <StatGrid columns={4}>
            <StatCard
                label="Saldo disponível"
                amount={stats.saldo_atual}
                hint="Soma das contas hoje"
                icon={Wallet}
                tone={stats.saldo_atual < 0 ? "danger" : "brand"}
                loading={loading}
            />
            <StatCard
                label="Receitas do mês"
                amount={stats.total_receitas}
                hint={`Recebido ${formatCurrency(stats.total_receitas_recebidas)}`}
                icon={ArrowUpRight}
                tone="success"
                loading={loading}
                href="/receitas"
            />
            <StatCard
                label="Despesas pagas"
                amount={stats.total_despesas_pagas}
                hint={`De ${formatCurrency(stats.total_despesas)} no mês`}
                icon={ArrowDownRight}
                tone="danger"
                loading={loading}
                href="/despesas"
            />
            <StatCard
                label="Despesas pendentes"
                amount={stats.total_despesas_pendentes}
                hint={
                    stats.total_despesas_atrasadas > 0
                        ? <span className="font-medium text-destructive">{formatCurrency(stats.total_despesas_atrasadas)} em atraso</span>
                        : "Total a pagar"
                }
                icon={AlertTriangle}
                tone="warning"
                loading={loading}
                href="/despesas"
            />
        </StatGrid>
    )
}

function Line({ label, value, tone, strong }: { label: string; value: number; tone: Tone; strong?: boolean }) {
    return (
        <div className={cn("flex justify-between gap-3 text-sm", strong && "border-t pt-2 font-semibold")}>
            <span className={cn("min-w-0", strong ? "text-foreground" : "text-muted-foreground")}>{label}</span>
            <span className={cn("tabular-nums", strong ? "font-bold" : "font-medium", TONE[tone].text)}>{formatCurrency(value)}</span>
        </div>
    )
}

export function QuickBalanceDetail({ stats, loading }: StatsProps) {
    const positivo = stats.saldo_atual >= 0

    return (
        <SectionCard
            title="Saldo disponível hoje"
            actions={<ToneBadge tone={positivo ? "success" : "danger"}>{positivo ? "Positivo" : "Negativo"}</ToneBadge>}
            contentClassName="space-y-5"
        >
            {loading ? (
                <Skeleton className="h-10 w-48" />
            ) : (
                <p className={cn("font-display text-3xl font-bold tracking-tight tabular-nums sm:text-4xl", positivo ? "text-brand-1" : "text-destructive")}>
                    {formatCurrency(stats.saldo_atual)}
                </p>
            )}

            <div className="space-y-2 border-t pt-4">
                <p className="eyebrow">Previsão até o fim do mês</p>
                <Line label="+ A receber" value={stats.receitas_a_receber} tone="success" />
                <Line label="− A pagar (inclui atrasadas)" value={stats.despesas_a_pagar} tone="warning" />
                {stats.faturas_a_pagar > 0 && <Line label="− Faturas de cartão" value={stats.faturas_a_pagar} tone="warning" />}
                <Line label="= Saldo previsto" value={stats.saldo_previsto} tone={stats.saldo_previsto >= 0 ? "brand" : "danger"} strong />
            </div>

            <div className="space-y-2 border-t pt-4">
                <p className="eyebrow">Resultado do mês</p>
                <Line label="Receitas" value={stats.total_receitas} tone="success" />
                <Line label="Despesas" value={stats.total_despesas} tone="danger" />
                <Line label="Resultado" value={stats.resultado_mes} tone={stats.resultado_mes >= 0 ? "brand" : "danger"} strong />
            </div>

            {stats.transacoes_pagas_sem_conta > 0 && (
                <div className="flex gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>
                        {stats.transacoes_pagas_sem_conta} lançamento(s) pago(s) sem conta bancária não entram no saldo.
                        Edite-os e vincule uma conta.
                    </p>
                </div>
            )}
        </SectionCard>
    )
}

const UPCOMING_LIMIT = 6

export function UpcomingPayments({ items, loading }: { items: UpcomingItem[]; loading?: boolean }) {
    const visible = items.slice(0, UPCOMING_LIMIT)
    const today = todayISO()

    return (
        <SectionCard title="Próximos vencimentos" actions={<span className="text-xs text-muted-foreground">7 dias + atrasados</span>}>
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-11" />)}
                </div>
            ) : visible.length === 0 ? (
                <div className="flex min-h-[100px] flex-col items-center justify-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                    <p className="text-sm">Nada vencendo nos próximos 7 dias</p>
                </div>
            ) : (
                <ul className="stagger -mx-2 space-y-0.5">
                    {visible.map(item => {
                        const Icon = item.kind === "fatura" ? CreditCard : item.kind === "receita" ? ArrowUp : ArrowDown
                        const quando = item.atrasado
                            ? "Atrasado"
                            : item.vencimento === today
                                ? "Vence hoje"
                                : format(parseLocalDate(item.vencimento), "dd 'de' MMM", { locale: ptBR })
                        return (
                            <li key={item.id}>
                                <Link href={item.href} className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                                    <IconTile icon={Icon} size="sm" tone={item.kind === "receita" ? "success" : "danger"} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium">{item.descricao}</span>
                                        <span className={cn("block text-xs", item.atrasado ? "font-medium text-destructive" : "text-muted-foreground")}>{quando}</span>
                                    </span>
                                    <Amount value={item.valor} kind={item.kind === "receita" ? "receita" : "neutral"} signed={false} className="text-sm" />
                                </Link>
                            </li>
                        )
                    })}
                    {items.length > UPCOMING_LIMIT && (
                        <li className="pt-1 text-center text-xs text-muted-foreground">+ {items.length - UPCOMING_LIMIT} outro(s)</li>
                    )}
                </ul>
            )}
        </SectionCard>
    )
}

const ALERT_TONE: Record<AlertLevel, Tone> = { critico: "danger", atencao: "warning", ok: "success" }
const ALERT_BG: Record<AlertLevel, string> = { critico: "bg-destructive/5", atencao: "bg-warning/5", ok: "bg-success/5" }

export function AlertCard({ alerts, loading }: { alerts: HealthAlert[]; loading?: boolean }) {
    const criticos = alerts.filter(a => a.level === "critico").length

    return (
        <SectionCard
            title="Alertas de saúde"
            actions={criticos > 0 && <ToneBadge tone="danger">{criticos} {criticos === 1 ? "crítico" : "críticos"}</ToneBadge>}
            contentClassName="space-y-2"
        >
            {loading ? (
                <Skeleton className="h-16" />
            ) : alerts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/10 p-3 text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="text-sm">Nenhum alerta no momento.</p>
                </div>
            ) : alerts.map(alert => {
                const tone = TONE[ALERT_TONE[alert.level]]
                const Icon = alert.level === "ok" ? CheckCircle2 : AlertTriangle
                const content = (
                    <>
                        <p className={cn("flex items-center gap-2 text-sm font-semibold", tone.text)}>
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {alert.titulo}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{alert.descricao}</p>
                    </>
                )
                const className = cn("block space-y-1 rounded-lg border p-3", tone.border, ALERT_BG[alert.level])
                return alert.href ? (
                    <Link key={alert.id} href={alert.href} className={cn(className, "transition-colors hover:bg-muted")}>{content}</Link>
                ) : (
                    <div key={alert.id} className={className}>{content}</div>
                )
            })}
        </SectionCard>
    )
}
