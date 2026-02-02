"use client"

import * as React from "react"
import { Plus, Download, Calendar, Search, ChevronRight, ArrowUpCircle, ArrowDownCircle, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    SummaryCards,
    QuickBalanceDetail,
    UpcomingPayments,
    AlertCard,
    QuickActions
} from "@/features/dashboard/components/summary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CashFlowChart } from "@/features/dashboard/components/cash-flow-chart"
import { useTransactions, useDashboardStats, useCashFlowData } from "@/features/transactions/hooks/use-transactions"
import { TransactionForm } from "@/features/transactions/components/transaction-form"
import { AllTransactionsModal } from "@/features/transactions/components/all-transactions-modal"
import { BankAccountsBalance } from "@/features/bank-accounts/components/bank-accounts-balance"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
// import * as XLSX from 'xlsx' // Removido para import dinâmico em handleExport
import { cn, parseLocalDate } from "@/lib/utils"

export default function DashboardPage() {
    const [month, setMonth] = React.useState(new Date().getMonth() + 1)
    const [year, setYear] = React.useState(new Date().getFullYear())
    const [page, setPage] = React.useState(1)

    React.useEffect(() => {
        setPage(1)
    }, [month, year])

    const filters = React.useMemo(() => ({
        month,
        year,
        page,
        pageSize: 10
    }), [month, year, page])
    const { transactions, totalCount, loading: loadingTransactions, error } = useTransactions(filters)
    const { stats, loading: loadingStats } = useDashboardStats(filters)
    const { data: cashFlowData, loading: loadingCashFlow } = useCashFlowData(12, true)

    const totalPages = Math.ceil(totalCount / 10)

    const handleExport = async () => {
        const XLSX = await import('xlsx')
        const dataToExport = transactions.map(t => ({
            Descrição: t.descricao,
            Valor: t.valor,
            Tipo: t.tipo.toUpperCase(),
            Perfil: t.tipo_transacao,
            Categoria: (t as any).categoria?.nome || 'N/A',
            Data: format(parseLocalDate(t.data_vencimento), 'dd/MM/yyyy'),
            Status: t.status.toUpperCase()
        }))

        const ws = XLSX.utils.json_to_sheet(dataToExport)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Transações")
        XLSX.writeFile(wb, `transacoes_${month}_${year}.xlsx`)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }


    return (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 max-w-[1600px] mx-auto pb-12">
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter font-display text-foreground">Dashboard</h1>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">Visão geral da sua saúde financeira</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center bg-secondary/30 dark:bg-zinc-100/5 rounded-xl border border-border px-2 w-full sm:w-auto">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-[10px] uppercase font-black tracking-widest"
                                onClick={() => setMonth(prev => prev === 1 ? 12 : prev - 1)}
                            >
                                <ChevronRight className="h-3 w-3 rotate-180" />
                            </Button>
                            <span className="text-[10px] uppercase font-black tracking-widest px-2 min-w-[100px] text-center">
                                {format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR })}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-[10px] uppercase font-black tracking-widest"
                                onClick={() => setMonth(prev => prev === 12 ? 1 : prev + 1)}
                            >
                                <ChevronRight className="h-3 w-3" />
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="hidden md:flex bg-secondary/50 dark:bg-zinc-100/5 border border-border h-10 px-4 rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-brand-1 hover:text-zinc-950 transition-all font-display text-foreground"
                        >
                            <Download className="mr-2 h-3 w-3" />
                            Exportar
                        </Button>
                        <TransactionForm
                            type="receita"
                            trigger={
                                <Button className="bg-brand-1 hover:bg-brand-2 text-zinc-950 shadow-xl shadow-brand-1/10 h-10 px-6 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all hover:scale-105 active:scale-95 font-display border-none w-full sm:w-auto">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nova Transação
                                </Button>
                            }
                        />
                    </div>
                </div>

                {/* Info Cards Grid */}
                <SummaryCards stats={stats} loading={loadingStats} />

                {/* Cash Flow Section */}
                <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl group transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between p-6">
                        <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest transition-colors">Fluxo de Caixa Mensal</CardTitle>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-brand-1 animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Receitas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Despesas</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="h-[260px] sm:h-[320px] lg:h-[400px] px-2 pb-6">
                        <CashFlowChart data={cashFlowData} loading={loadingCashFlow} />
                    </CardContent>
                </Card>

                {/* Recent Transactions Table */}
                <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
                        <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Últimas Movimentações</CardTitle>
                        <div className="flex gap-2 text-xs">
                            <Button variant="ghost" size="sm" onClick={handleExport} className="text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-brand-1 transition-colors cursor-pointer active:scale-95">
                                <Download className="mr-2 h-3 w-3" /> Exportar
                            </Button>
                            <AllTransactionsModal
                                initialMonth={month}
                                initialYear={year}
                                trigger={
                                    <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest text-brand-1 hover:scale-105 transition-all cursor-pointer active:scale-95">
                                        Ver todas <ChevronRight className="ml-1 h-3 w-3" />
                                    </Button>
                                }
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="px-0 pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-none hover:bg-transparent text-muted-foreground/30">
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 px-6">Descrição</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest h-12 hidden sm:table-cell">Tipo</TableHead>
                                    <TableHead className="font-black text-[11px] uppercase tracking-widest h-12 hidden md:table-cell">Categoria</TableHead>
                                    <TableHead className="font-black text-[11px] uppercase tracking-widest h-12">Data</TableHead>
                                    <TableHead className="font-black text-[11px] uppercase tracking-widest h-12 hidden sm:table-cell">Status</TableHead>
                                    <TableHead className="font-black text-[11px] uppercase tracking-widest h-12 text-right px-6">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingTransactions ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-[10px] uppercase font-black tracking-widest opacity-50 italic">Carregando...</TableCell>
                                    </TableRow>
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-[10px] uppercase font-black tracking-widest opacity-50 italic">Nenhuma transação encontrada</TableCell>
                                    </TableRow>
                                ) : transactions.map((t) => (
                                    <TableRow key={t.id} className="border-border hover:bg-brand-1/[0.04] transition-all group cursor-pointer active:bg-brand-1/[0.08]">
                                        <TableCell className="font-medium px-6 py-5 flex items-center gap-4 whitespace-normal">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-300",
                                                t.tipo_transacao === 'receita' ? "bg-brand-2/10 text-brand-2" : "bg-rose-500/10 text-rose-500"
                                            )}>
                                                {t.tipo_transacao === 'receita' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[13px] tracking-tight text-foreground group-hover:text-brand-1 transition-colors">{t.descricao}</span>
                                                <span className="text-[10px] text-muted-foreground/50 uppercase font-black tracking-widest italic tracking-tighter">{(t as any).categoria?.nome || 'Geral'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell"><span className="bg-secondary text-muted-foreground border border-border px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter">{t.tipo_transacao}</span></TableCell>
                                        <TableCell className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-tighter font-body hidden md:table-cell">{(t as any).categoria?.nome || '-'}</TableCell>
                                        <TableCell className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-tighter font-body">
                                            {format(parseLocalDate(t.data_vencimento), 'dd MMM yyyy', { locale: ptBR }).toUpperCase()}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                                                t.status === 'liquidado' ? "bg-brand-1/10 text-brand-1" : "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {t.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className={cn(
                                            "text-right font-black px-6 tracking-tighter text-sm",
                                            t.tipo_transacao === 'receita' ? "text-brand-2" : "text-rose-500"
                                        )}>
                                            {t.tipo_transacao === 'receita' ? '+' : '−'} {formatCurrency(t.valor)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination Area */}
                        {!loadingTransactions && totalCount > 10 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                                <div className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">
                                    Mostrando {((page - 1) * 10) + 1} até {Math.min(page * 10, totalCount)} de {totalCount}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="h-8 w-8 rounded-xl glass-card border-none hover:bg-brand-1 hover:text-zinc-950 disabled:opacity-30 transition-all font-display"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <Button
                                                key={i + 1}
                                                variant={page === i + 1 ? "default" : "outline"}
                                                size="icon"
                                                onClick={() => setPage(i + 1)}
                                                className={cn(
                                                    "h-8 w-8 rounded-xl border-none transition-all text-[11px] font-black font-display",
                                                    page === i + 1
                                                        ? "bg-brand-1 text-zinc-950 shadow-lg shadow-brand-1/20"
                                                        : "glass-card hover:bg-brand-1/10 text-muted-foreground"
                                                )}
                                            >
                                                {i + 1}
                                            </Button>
                                        ))}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="h-8 w-8 rounded-xl glass-card border-none hover:bg-brand-1 hover:text-zinc-950 disabled:opacity-30 transition-all font-display"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Sidebar Area */}
            <div className="lg:col-span-4 space-y-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Ações Rápidas</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TransactionForm
                            type="receita"
                            trigger={
                                <Button variant="outline" className="h-28 flex flex-col gap-3 glass-card border-none hover:bg-brand-1 hover:text-zinc-950 transition-all duration-500 group rounded-[1.5rem] cursor-pointer active:scale-95 shadow-lg hover:shadow-brand-1/20 dark:text-foreground">
                                    <div className="h-10 w-10 rounded-xl bg-brand-1/10 flex items-center justify-center group-hover:bg-zinc-950 group-hover:text-brand-1 transition-all">
                                        <Plus className="h-6 w-6 transition-transform group-hover:scale-110" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Receita</span>
                                </Button>
                            }
                        />
                        <TransactionForm
                            type="despesa"
                            trigger={
                                <Button variant="outline" className="h-28 flex flex-col gap-3 glass-card border-none hover:bg-rose-500 hover:text-white transition-all duration-500 group rounded-[1.5rem] cursor-pointer active:scale-95 shadow-lg hover:shadow-rose-500/20 dark:text-foreground">
                                    <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:bg-white group-hover:text-rose-500 transition-all">
                                        <ArrowDownCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Despesa</span>
                                </Button>
                            }
                        />
                    </div>
                </div>

                <QuickBalanceDetail stats={stats} loading={loadingStats} />

                <BankAccountsBalance />

                <UpcomingPayments />
                <AlertCard />
            </div>
        </div>
    )
}
