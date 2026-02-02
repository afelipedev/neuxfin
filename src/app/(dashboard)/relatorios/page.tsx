"use client"

import { PieChart, BarChart2, TrendingUp, TrendingDown, Info, Calendar, Sparkles, BrainCircuit, Target, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CategoryPieChart } from "@/features/dashboard/components/category-pie-chart"
import { CashFlowChart } from "@/features/dashboard/components/cash-flow-chart"

export default function RelatoriosPage() {
    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Análise de Saúde Financeira</h1>
                    <p className="text-sm text-muted-foreground">Insights profundos e recomendações personalizadas por IA</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="bg-zinc-900/5 dark:bg-zinc-100/5 border-none w-full sm:w-auto justify-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        Últimos 6 Meses
                    </Button>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20 w-full sm:w-auto justify-center">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Nova Análise IA
                    </Button>
                </div>
            </div>

            {/* AI Insights Banner */}
            <Card className="border-none bg-gradient-to-r from-orange-600/10 via-orange-600/5 to-transparent shadow-none overflow-hidden">
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/20 shrink-0">
                        <BrainCircuit className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-1 flex-1 text-center md:text-left">
                        <h3 className="text-lg font-bold">Insight da IA: Sua taxa de poupança subiu!</h3>
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            Identificamos uma redução de 15% nos gastos com "Lazer" comparado ao mês passado.
                            Isso te coloca 2 meses mais próximo da sua meta de "Reserva de Emergência".
                            <span className="text-orange-600 font-bold ml-1">Continuar assim?</span>
                        </p>
                    </div>
                    <Button size="sm" className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:opacity-90">Ver detalhes</Button>
                </CardContent>
            </Card>

            {/* Main Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Poupança</p>
                        <h3 className="text-3xl font-bold text-emerald-500 mt-1">24.5%</h3>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-500 font-bold">
                            <ArrowUpRight className="h-3 w-3" /> +2.1% este mês
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comprometimento</p>
                        <h3 className="text-3xl font-bold text-amber-500 mt-1">12.5%</h3>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-500 font-bold">
                            <ShieldCheck className="h-3 w-3" /> Nível Saudável
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Autonomia Financeira</p>
                        <h3 className="text-3xl font-bold text-blue-500 mt-1">4.2 meses</h3>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                            Tempo de reserva atual
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meta Trimestral</p>
                        <h3 className="text-3xl font-bold text-orange-600 mt-1">65%</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-600 rounded-full w-[65%]" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-base font-bold">Distribuição de Gastos</CardTitle>
                        <CardDescription>Onde você mais investe seu capital</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[260px] sm:h-[320px] lg:h-[350px]">
                        <CategoryPieChart />
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold">Fluxo por Perfil (PF vs PJ)</CardTitle>
                            <CardDescription>Comparativo de movimentação mensal</CardDescription>
                        </div>
                        <div className="flex gap-4 text-[10px]">
                            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-blue-500" /> Pessoa Física</div>
                            <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-orange-600" /> Jurídica</div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[260px] sm:h-[320px] lg:h-[350px]">
                        <CashFlowChart />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none p-6 space-y-4">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Target className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm">Objetivo: Viagem Europa</h4>
                        <p className="text-xs text-muted-foreground">Você está a 75% da meta. Se mantiver o ritmo, atingirá em Maio/2026.</p>
                    </div>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none p-6 space-y-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm">Eficiência Operacional</h4>
                        <p className="text-xs text-muted-foreground">Suas taxas bancárias caíram 20%. Ótima escolha de corretora!</p>
                    </div>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none p-6 space-y-4">
                    <div className="h-10 w-10 rounded-full bg-orange-600/10 flex items-center justify-center text-orange-600">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-sm">Atenção ao Cartão</h4>
                        <p className="text-xs text-muted-foreground">Gastos com IFood subiram 30%. Que tal cozinhar mais este fim de semana?</p>
                    </div>
                </Card>
            </div>
        </div>
    )
}

function ShieldCheck({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
}

function Zap({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 14.75 12 3l8 11.75-8 9L4 14.75Z" /><path d="M12 3v11.75" /></svg>
}

