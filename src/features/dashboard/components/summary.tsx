import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, Wallet, ArrowUp, ArrowDown, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StatsProps {
    stats: {
        total_receitas: number
        total_receitas_recebidas: number
        total_despesas: number
        total_despesas_pagas: number
        total_despesas_pendentes: number
        saldo_atual: number
    }
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none glass-card glow-primary overflow-hidden group hover:shadow-2xl hover:shadow-brand-1/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
                            <h3 className="text-3xl font-black text-brand-1 tracking-tighter">
                                {formatCurrency(stats.saldo_atual)}
                            </h3>
                            <p className="text-[10px] text-muted-foreground/50 font-medium font-body uppercase tracking-tighter">Resultado Líquido</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-brand-1/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-1 group-hover:text-zinc-950 shadow-lg shadow-brand-1/20 transition-all duration-500">
                            <Wallet className="h-5 w-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none glass-card overflow-hidden group hover:shadow-2xl hover:shadow-brand-2/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Receitas do Mês</p>
                            <h3 className="text-3xl font-black text-brand-2 tracking-tighter">
                                {formatCurrency(stats.total_receitas)}
                            </h3>
                            <p className="text-[10px] text-muted-foreground/50 font-medium font-body uppercase tracking-tighter">Total Entradas</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-brand-2/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-2 group-hover:text-zinc-950 shadow-lg shadow-brand-2/20 transition-all duration-500">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none glass-card overflow-hidden group hover:shadow-2xl hover:shadow-rose-500/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Despesas Pagas</p>
                            <h3 className="text-3xl font-black text-rose-500 tracking-tighter">
                                {formatCurrency(stats.total_despesas_pagas)}
                            </h3>
                            <p className="text-[10px] text-muted-foreground/50 font-medium font-body uppercase tracking-tighter">Total Efetuado</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white shadow-lg shadow-rose-500/20 transition-all duration-500">
                            <ArrowDownRight className="h-5 w-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none glass-card overflow-hidden group hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Despesas Pendentes</p>
                            <h3 className="text-3xl font-black text-amber-500 tracking-tighter">
                                {formatCurrency(stats.total_despesas_pendentes)}
                            </h3>
                            <p className="text-[10px] text-muted-foreground/50 font-medium font-body uppercase tracking-tighter">Total à Pagar</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white shadow-lg shadow-amber-500/20 transition-all duration-500">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export function QuickBalanceDetail({ stats, loading }: StatsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    return (
        <Card className="border-none glass-card bg-gradient-to-br from-secondary/30 to-brand-1/5 dark:from-white/5 dark:to-brand-1/5 overflow-hidden shadow-2xl shadow-brand-1/5 transition-all duration-300">
            <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Disponível</h4>
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                        stats.saldo_atual >= 0 ? "bg-brand-1/10 text-brand-1" : "bg-rose-500/10 text-rose-500"
                    )}>
                        {stats.saldo_atual >= 0 ? "Positivo" : "Negativo"}
                    </span>
                </div>

                <div className="space-y-1">
                    <h3 className={cn(
                        "text-4xl font-black tracking-tighter",
                        stats.saldo_atual >= 0 ? "text-brand-1" : "text-rose-500"
                    )}>
                        {formatCurrency(stats.saldo_atual)}
                    </h3>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-muted-foreground/60">Receitas Recebidas:</span>
                        <span className="text-brand-2 font-bold font-body">{formatCurrency(stats.total_receitas_recebidas)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-muted-foreground/60">Despesas Pagas:</span>
                        <span className="text-rose-500 font-bold font-body">{formatCurrency(stats.total_despesas_pagas)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold">
                        <span className="text-muted-foreground/60">Despesas Pendentes:</span>
                        <span className="text-amber-500 font-bold font-body">{formatCurrency(stats.total_despesas_pendentes)}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-xs font-black border-t border-border">
                        <span className="uppercase tracking-widest text-[10px] text-foreground/50">Resultado:</span>
                        <span className="text-brand-1">{formatCurrency(stats.saldo_atual)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}


export function UpcomingPayments() {
    return (
        <Card className="border-none glass-card transition-all duration-300">
            <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Próximos Vencimentos</CardTitle>
                    <button className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">...</button>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 min-h-[120px] flex flex-col items-center justify-center opacity-40">
                <div className="h-8 w-8 rounded-full bg-secondary dark:bg-zinc-100/10 flex items-center justify-center mb-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-[10px] text-muted-foreground font-medium italic text-center uppercase tracking-tighter">Sem contas pendentes</p>
            </CardContent>
        </Card>
    )
}

export function AlertCard() {
    return (
        <Card className="border-none glass-card group cursor-pointer active:scale-[0.98] transition-all duration-300">
            <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Alertas de Saúde</CardTitle>
                    <span className="bg-rose-500 text-white text-[10px] h-5 px-2 rounded-full font-black flex items-center">0 Críticos</span>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2 group-hover:bg-amber-500/10 transition-all duration-300">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Reserva Insuficiente</h5>
                    </div>
                    <p className="text-[11px] text-amber-500/80 leading-relaxed font-semibold">
                        Sua reserva atual cobre 1.1 meses. Meta recomendada: 6 meses.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

export function QuickActions({ onAddReceita, onAddDespesa }: { onAddReceita?: () => void, onAddDespesa?: () => void }) {
    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Ações Rápidas</h4>
            <div className="grid grid-cols-2 gap-4">
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
