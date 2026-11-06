"use client"

import Link from "next/link"
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, formatCurrency, parseLocalDate } from "@/lib/utils"
import { useDashboardAlerts } from "../hooks/use-dashboard-alerts"

/**
 * Sino do cabeçalho: alertas de saúde (exceto "ok") e vencimentos dos próximos 7 dias.
 * O ponto só aparece quando há algo pedindo atenção.
 */
export function HeaderNotifications() {
    const { alerts, upcoming, loading } = useDashboardAlerts()
    const pending = alerts.filter(a => a.level !== "ok")
    const critical = pending.some(a => a.level === "critico") || upcoming.some(u => u.atrasado)
    const count = pending.length + upcoming.length

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={count > 0 ? `Notificações: ${count} itens` : "Notificações"}
                    className="relative text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10 rounded-xl transition-all"
                >
                    <Bell className="h-5 w-5" />
                    {!loading && count > 0 && (
                        <span
                            className={cn(
                                "absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-background",
                                critical ? "bg-rose-500" : "bg-amber-500"
                            )}
                            aria-hidden="true"
                        />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] p-0">
                <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-bold">Notificações</p>
                    <p className="text-xs text-muted-foreground">Alertas e vencimentos dos próximos 7 dias</p>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                    {loading ? (
                        <p className="px-4 py-6 text-center text-xs text-muted-foreground">Carregando...</p>
                    ) : count === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                            <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
                            <p className="text-sm font-semibold">Tudo em dia</p>
                            <p className="text-xs text-muted-foreground">Nenhum alerta ou vencimento próximo.</p>
                        </div>
                    ) : (
                        <>
                            {pending.length > 0 && (
                                <ul className="divide-y divide-border">
                                    {pending.map(alert => {
                                        const body = (
                                            <div className="flex gap-3 px-4 py-3">
                                                <AlertTriangle
                                                    className={cn("mt-0.5 h-4 w-4 shrink-0", alert.level === "critico" ? "text-rose-500" : "text-amber-500")}
                                                    aria-hidden="true"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold">{alert.titulo}</p>
                                                    <p className="text-xs text-muted-foreground">{alert.descricao}</p>
                                                </div>
                                            </div>
                                        )
                                        return (
                                            <li key={alert.id}>
                                                {alert.href
                                                    ? <Link href={alert.href} className="block hover:bg-muted/50">{body}</Link>
                                                    : body}
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}

                            {upcoming.length > 0 && (
                                <>
                                    <p className="border-t border-border bg-muted/30 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Vencimentos
                                    </p>
                                    <ul className="divide-y divide-border">
                                        {upcoming.map(item => {
                                            const Icon = item.kind === "fatura" ? CreditCard : CalendarClock
                                            return (
                                                <li key={item.id}>
                                                    <Link href={item.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                                                        <Icon className={cn("h-4 w-4 shrink-0", item.atrasado ? "text-rose-500" : "text-muted-foreground")} aria-hidden="true" />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-xs font-semibold">{item.descricao}</span>
                                                            <span className={cn("block text-[10px]", item.atrasado ? "text-rose-500" : "text-muted-foreground")}>
                                                                {item.atrasado ? "Atrasado desde " : "Vence em "}
                                                                {format(parseLocalDate(item.vencimento), "dd/MM")}
                                                            </span>
                                                        </span>
                                                        <span className={cn(
                                                            "text-xs font-bold tabular-nums",
                                                            item.kind === "receita" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                                        )}>
                                                            {formatCurrency(item.valor)}
                                                        </span>
                                                    </Link>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </>
                            )}
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
