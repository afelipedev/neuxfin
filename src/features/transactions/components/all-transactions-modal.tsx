"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Download,
    ChevronRight,
    ChevronLeft,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    Filter,
    PieChart as PieChartIcon,
    Table as TableIcon
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTransactions } from "@/features/transactions/hooks/use-transactions"
import { useCategories } from "@/features/settings/hooks/use-categories"
import { CategoryPieChart } from "@/features/dashboard/components/category-pie-chart"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
// import * as XLSX from 'xlsx' // Removido para import dinâmico em handleExport
import { cn, parseLocalDate } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

interface AllTransactionsModalProps {
    initialMonth: number
    initialYear: number
    trigger?: React.ReactNode
}

export function AllTransactionsModal({ initialMonth, initialYear, trigger }: AllTransactionsModalProps) {
    const [open, setOpen] = React.useState(false)
    const [month, setMonth] = React.useState(initialMonth)
    const [year, setYear] = React.useState(initialYear)
    const [type, setType] = React.useState<'todos' | 'PF' | 'PJ'>('todos')
    const [nature, setNature] = React.useState<'todos' | 'receita' | 'despesa'>('todos')
    const [category, setCategory] = React.useState<string>('todos')
    const [page, setPage] = React.useState(1)
    const pageSize = 5

    const filters = React.useMemo(() => ({
        month,
        year,
        tipo: type === 'todos' ? undefined : type,
        tipo_transacao: nature === 'todos' ? undefined : nature,
        categoria_id: category === 'todos' ? undefined : category,
        page,
        pageSize,
        sortOrder: 'desc' as const
    }), [month, year, type, nature, category, page, pageSize])

    const { transactions, totalCount, loading } = useTransactions(filters)
    const { categories } = useCategories()

    // Para o gráfico, buscamos dados resumidos ou uma amostra maior sem paginação (limite de 1000 para performance)
    const [chartData, setChartData] = React.useState<any[]>([])
    const { transactions: allTransactions } = useTransactions({
        month,
        year,
        tipo: type === 'todos' ? undefined : type,
        tipo_transacao: nature === 'todos' ? undefined : nature,
        categoria_id: category === 'todos' ? undefined : category,
        pageSize: 1000
    })

    React.useEffect(() => {
        if (allTransactions) {
            const summary = allTransactions.reduce((acc: any, t) => {
                const name = (t as any).categoria?.nome || 'Geral'
                if (!acc[name]) {
                    acc[name] = { name, value: 0, color: (t as any).categoria?.cor }
                }
                acc[name].value += Number(t.valor)
                return acc
            }, {})
            setChartData(Object.values(summary))
        }
    }, [allTransactions])

    const totalPages = Math.ceil(totalCount / pageSize)
    const startItem = (page - 1) * pageSize + 1
    const endItem = Math.min(page * pageSize, totalCount)
    const pageNumbers = React.useMemo(() => {
        if (totalPages <= 1) return [1]
        const maxButtons = 5
        const start = Math.max(1, Math.min(page - 2, totalPages - (maxButtons - 1)))
        const end = Math.min(totalPages, start + (maxButtons - 1))
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }, [page, totalPages])

    const handleExport = async () => {
        const XLSX = await import('xlsx')
        const dataToExport = allTransactions.map(t => ({
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
        XLSX.writeFile(wb, `relatorio_transacoes_${month}_${year}.xlsx`)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-widest text-brand-1 hover:scale-105 transition-all cursor-pointer active:scale-95">
                        Ver todas <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] xl:max-w-7xl h-[94vh] flex flex-col border-none glass-card rounded-[2.5rem] p-0 gap-0 overflow-hidden outline-none">
                <DialogHeader className="p-6 md:p-8 pb-2 shrink-0">
                    <div className="flex flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl md:text-2xl font-black tracking-tighter uppercase font-display leading-none">Relatório Detalhado</DialogTitle>
                            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-black">Análise completa de movimentações</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                className="bg-brand-1/10 hover:bg-brand-1 text-brand-1 hover:text-zinc-950 border-none h-9 md:h-10 px-3 md:px-4 rounded-xl text-[9px] md:text-[10px] uppercase font-black tracking-widest transition-all font-display shrink-0"
                            >
                                <Download className="mr-1 md:mr-2 h-3 w-3" />
                                <span className="hidden xs:inline">Exportar XLSX</span>
                                <span className="xs:hidden">XLSX</span>
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Filters Section - Fixed at top */}
                <div className="px-6 md:px-8 pb-4 shrink-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 bg-secondary/10 p-4 rounded-3xl border border-white/5">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Mês/Ano</label>
                            <div className="flex items-center bg-zinc-950/30 rounded-xl px-1 h-9 md:h-10 border border-white/5">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-brand-1" onClick={() => setMonth(prev => prev === 1 ? 12 : prev - 1)}>
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <span className="text-[9px] md:text-[10px] font-black uppercase text-center flex-1 truncate px-1">
                                    {format(new Date(year, month - 1), 'MMM yy', { locale: ptBR })}
                                </span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-brand-1" onClick={() => setMonth(prev => prev === 12 ? 1 : prev + 1)}>
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Perfil</label>
                            <Select value={type} onValueChange={(v: any) => { setType(v); setPage(1); }}>
                                <SelectTrigger className="h-9 md:h-10 bg-zinc-950/30 border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10">
                                    <SelectItem value="todos">Todos Perfis</SelectItem>
                                    <SelectItem value="PF">P. Física (PF)</SelectItem>
                                    <SelectItem value="PJ">P. Jurídica (PJ)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Natureza</label>
                            <Select value={nature} onValueChange={(v: any) => { setNature(v); setPage(1); }}>
                                <SelectTrigger className="h-9 md:h-10 bg-zinc-950/30 border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                                    <SelectValue placeholder="Natureza" />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10">
                                    <SelectItem value="todos">Todas</SelectItem>
                                    <SelectItem value="receita">Receitas</SelectItem>
                                    <SelectItem value="despesa">Despesas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 sm:col-span-1 lg:col-span-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Categoria</label>
                            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                                <SelectTrigger className="h-9 md:h-10 bg-zinc-950/30 border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-tight">
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent className="glass-card border-white/10 max-h-[200px]">
                                    <SelectItem value="todos">Todas Categorias</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end sm:col-span-2 lg:col-span-1">
                            <Button
                                variant="outline"
                                className="w-full h-9 md:h-10 rounded-xl border-white/5 bg-zinc-950/30 text-[9px] uppercase font-black tracking-widest text-muted-foreground hover:bg-brand-1/10 hover:text-brand-1"
                                onClick={() => {
                                    setMonth(initialMonth)
                                    setYear(initialYear)
                                    setType('todos')
                                    setNature('todos')
                                    setCategory('todos')
                                    setPage(1)
                                }}
                            >
                                Resetar
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* Visualization */}
                        <div className="md:col-span-4 lg:col-span-4 min-h-0">
                            <Card className="border-none bg-zinc-950/20 rounded-[2rem] overflow-hidden shadow-2xl">
                                <CardContent className="p-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <PieChartIcon className="h-3 w-3 text-brand-1" /> Gráfico
                                        </span>
                                        <span className="text-[9px] opacity-40 italic">Por Categoria</span>
                                    </h3>
                                    <div className="h-[260px] md:h-[300px] w-full">
                                        <CategoryPieChart data={chartData} height={260} />
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/40 border border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black uppercase text-muted-foreground/60 tracking-wider">Saldo do Filtro</span>
                                                <span className={cn(
                                                    "text-base md:text-lg font-black tracking-tighter",
                                                    allTransactions.reduce((acc, t) => acc + (t.tipo_transacao === 'receita' ? Number(t.valor) : -Number(t.valor)), 0) >= 0 ? "text-brand-1" : "text-rose-500"
                                                )}>
                                                    {formatCurrency(allTransactions.reduce((acc, t) => acc + (t.tipo_transacao === 'receita' ? Number(t.valor) : -Number(t.valor)), 0))}
                                                </span>
                                            </div>
                                            <div className="h-10 w-10 rounded-xl bg-brand-1/10 flex items-center justify-center">
                                                <Filter className="h-4 w-4 text-brand-1" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* List */}
                        <div className="md:col-span-8 lg:col-span-8 min-h-0">
                            <Card className="border-none bg-zinc-950/10 rounded-[2.5rem] overflow-hidden shadow-xl flex flex-col">
                                <div className="p-6 pb-2 shrink-0 flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <TableIcon className="h-3 w-3 text-brand-1" /> Transações Recentes
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-tight text-brand-1 bg-brand-1/10 px-2 py-1 rounded-lg border border-brand-1/10">
                                            {totalCount} REGISTROS
                                        </span>
                                    </div>
                                </div>
                                <CardContent className="p-0 px-2 flex-1 min-h-0 flex flex-col">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-zinc-950/50 backdrop-blur-md z-10">
                                                <TableRow className="border-none hover:bg-transparent text-muted-foreground/30">
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest h-12 px-6">Descrição</TableHead>
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">Data</TableHead>
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest h-12">Perfil</TableHead>
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest h-12 text-right px-6">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    Array.from({ length: pageSize }).map((_, i) => (
                                                        <TableRow key={i} className="border-none">
                                                            <TableCell colSpan={4} className="h-12 border-none px-6">
                                                                <div className="h-4 w-full bg-white/5 animate-pulse rounded-full" />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : transactions.length === 0 ? (
                                                    <TableRow className="border-none">
                                                        <TableCell colSpan={4} className="text-center py-20 text-[10px] uppercase font-black tracking-widest opacity-50 italic">
                                                            Nenhuma transação encontrada para este filtro
                                                        </TableCell>
                                                    </TableRow>
                                                ) : transactions.map((t) => (
                                                    <TableRow key={t.id} className="border-white/5 hover:bg-white/[0.03] transition-all group border-b last:border-none">
                                                        <TableCell className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-[12px] tracking-tight text-foreground group-hover:text-brand-1 transition-colors">{t.descricao}</span>
                                                                <span className="text-[9px] text-muted-foreground/40 uppercase font-black tracking-widest">{(t as any).categoria?.nome || 'Geral'}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-tighter">
                                                            {format(parseLocalDate(t.data_vencimento), 'dd/MM/yy')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className={cn(
                                                                "inline-flex items-center h-5 px-2 rounded-full text-[8px] font-black uppercase tracking-tighter border",
                                                                t.tipo === 'PF'
                                                                    ? "bg-blue-500/5 text-blue-500 border-blue-500/20"
                                                                    : "bg-orange-500/5 text-orange-500 border-orange-500/20"
                                                            )}>
                                                                {t.tipo}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className={cn(
                                                            "text-right font-black px-6 tracking-tighter text-xs",
                                                            t.tipo_transacao === 'receita' ? "text-brand-2" : "text-rose-500"
                                                        )}>
                                                            <span className="opacity-50 mr-1">{t.tipo_transacao === 'receita' ? '+' : '−'}</span>
                                                            {formatCurrency(t.valor)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination - Fixed at bottom of the card */}
                                    {!loading && totalCount > pageSize && (
                                        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 shrink-0 bg-zinc-950/20">
                                            <div className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/40 space-x-2">
                                                <span>Página {page} de {totalPages}</span>
                                                <span className="opacity-20 text-[8px]">|</span>
                                                <span>Mostrando {startItem}–{endItem} de {totalCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setPage(p => Math.max(1, p - 1)); }}
                                                    disabled={page === 1}
                                                    className="h-8 w-8 rounded-xl bg-white/5 hover:bg-brand-1 hover:text-zinc-950 disabled:opacity-10 transition-all font-display border border-white/5"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <div className="flex gap-1">
                                                    {pageNumbers.map((pageNum) => (
                                                        <Button
                                                            key={pageNum}
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setPage(pageNum)}
                                                            className={cn(
                                                                "h-8 w-8 rounded-xl text-[10px] font-black transition-all border border-white/5",
                                                                page === pageNum
                                                                    ? "bg-brand-1 text-zinc-950 border-brand-1"
                                                                    : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                                                            )}
                                                        >
                                                            {pageNum}
                                                        </Button>
                                                    ))}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); }}
                                                    disabled={page === totalPages}
                                                    className="h-8 w-8 rounded-xl bg-white/5 hover:bg-brand-1 hover:text-zinc-950 disabled:opacity-10 transition-all font-display border border-white/5"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    )
}
