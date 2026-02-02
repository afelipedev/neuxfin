"use client"

import { useState } from "react"
import { Filter, Download, Calendar, ArrowUpRight, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TransactionForm } from "@/features/transactions/components/transaction-form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTransactions, useTransactionStats } from "@/features/transactions/hooks/use-transactions"
import { useCategories } from "@/features/settings/hooks/use-categories"
import { ReplicateDialog } from "@/features/transactions/components/replicate-dialog"
import { EditTransactionDialog } from "@/features/transactions/components/edit-transaction-dialog"
import { DeleteTransactionDialog } from "@/features/transactions/components/delete-transaction-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, parseLocalDate } from "@/lib/utils"

export default function ReceitasPage() {
    const currentDate = new Date()
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
    const [tipoFilter, setTipoFilter] = useState<'todos' | 'PF' | 'PJ'>('todos')
    const [statusFilter, setStatusFilter] = useState<'todos' | 'liquidado' | 'pendente' | 'atrasado'>('todos')
    const [categoriaFilter, setCategoriaFilter] = useState<string>('todas')

    // Estados de Paginação e Ordenação
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize] = useState(10)
    const [sortBy, setSortBy] = useState('data_vencimento')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

    const { transactions, totalCount, loading, refresh } = useTransactions({
        month: selectedMonth,
        year: selectedYear,
        tipo_transacao: 'receita',
        tipo: tipoFilter === 'todos' ? undefined : tipoFilter,
        status: statusFilter === 'todos' ? undefined : statusFilter,
        categoria_id: categoriaFilter === 'todas' ? undefined : categoriaFilter,
        page: currentPage,
        pageSize: pageSize,
        sortBy: sortBy,
        sortOrder: sortOrder
    })

    const { stats, loading: statsLoading } = useTransactionStats({
        month: selectedMonth,
        year: selectedYear,
        tipo_transacao: 'receita',
    })

    const { categories } = useCategories()
    const receitaCategories = categories.filter((c: { tipo: string }) => c.tipo === 'receita')

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    })

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const formatDate = (dateString: string) => {
        return parseLocalDate(dateString).toLocaleDateString('pt-BR')
    }

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            liquidado: { className: "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30", label: "Recebido" },
            pendente: { className: "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30", label: "Pendente" },
            atrasado: { className: "bg-rose-500/20 text-rose-700 hover:bg-rose-500/30", label: "Atrasado" },
        }
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente
        return <Badge className={`${config.className} border-none text-[10px] h-5`}>{config.label}</Badge>
    }

    const toggleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
        } else {
            setSortBy(field)
            setSortOrder('desc')
        }
    }

    const getSortIcon = (field: string) => {
        if (sortBy !== field) return <ArrowUpDown className="ml-2 h-3 w-3" />
        return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />
    }

    const totalPages = Math.ceil(totalCount / pageSize)
    const percentLiquidado = stats.total > 0 ? (stats.liquidado / stats.total) * 100 : 0

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Receitas e Projeções</h1>
                    <p className="text-sm text-muted-foreground">Controle suas entradas e planeje seu faturamento</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                    <Select
                        value={`${selectedYear}-${selectedMonth}`}
                        onValueChange={(value) => {
                            const [year, month] = value.split('-').map(Number)
                            setSelectedYear(year)
                            setSelectedMonth(month)
                            setCurrentPage(1) // Volta para primeira página ao mudar mês
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-[180px] bg-zinc-900/5 dark:bg-zinc-100/5 border-none">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => {
                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6 + i, 1)
                                const month = date.getMonth() + 1
                                const year = date.getFullYear()
                                const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                                return (
                                    <SelectItem key={`${year}-${month}`} value={`${year}-${month}`}>
                                        {label}
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                    <TransactionForm type="receita" onSuccess={refresh} />
                </div>
            </div>

            {/* Cards de Estatísticas */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Acumulado</p>
                                {statsLoading ? (
                                    <Skeleton className="h-9 w-32" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-emerald-500 tracking-tight">
                                        {formatCurrency(stats.total)}
                                    </h3>
                                )}
                                <p className="text-[10px] text-muted-foreground">Mês vigente</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recebido (Liquidado)</p>
                                {statsLoading ? (
                                    <Skeleton className="h-9 w-32" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-emerald-500 tracking-tight">
                                        {formatCurrency(stats.liquidado)}
                                    </h3>
                                )}
                                <p className="text-[10px] text-muted-foreground">
                                    {percentLiquidado.toFixed(0)}% do previsto
                                </p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[10px]">OK</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/10 shadow-none overflow-hidden group hover:shadow-md transition-all">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projeção Pendente</p>
                                {statsLoading ? (
                                    <Skeleton className="h-9 w-32" />
                                ) : (
                                    <h3 className="text-3xl font-bold text-blue-500 tracking-tight">
                                        {formatCurrency(stats.pendente)}
                                    </h3>
                                )}
                                <p className="text-[10px] text-muted-foreground">A receber</p>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Transações */}
            <Card className="border-none bg-zinc-900/5 dark:bg-zinc-100/5 shadow-none overflow-hidden">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neux-1/5 px-6 py-4">
                    <div className="flex items-center gap-4 flex-wrap w-full">
                        <div className="flex items-center gap-2">
                            <Select value={tipoFilter} onValueChange={(value: any) => { setTipoFilter(value); setCurrentPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs border-none bg-zinc-900/5 dark:bg-zinc-100/10">
                                    <SelectValue placeholder="Tipo (PF/PJ)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos (PF & PJ)</SelectItem>
                                    <SelectItem value="PF">Apenas PF</SelectItem>
                                    <SelectItem value="PJ">Apenas PJ</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={(value: any) => { setStatusFilter(value); setCurrentPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs border-none bg-zinc-900/5 dark:bg-zinc-100/10">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos Status</SelectItem>
                                    <SelectItem value="liquidado">Recebido</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="atrasado">Atrasado</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={categoriaFilter} onValueChange={(value) => { setCategoriaFilter(value); setCurrentPage(1); }}>
                                <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs border-none bg-zinc-900/5 dark:bg-zinc-100/10">
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas Categorias</SelectItem>
                                    {receitaCategories.map((cat: { id: string; nome: string }) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <ReplicateDialog transactions={transactions} onSuccess={refresh} />
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-full sm:w-auto justify-center">
                        <Download className="mr-2 h-4 w-4" /> Exportar Planilha
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-none hover:bg-transparent text-muted-foreground">
                                <TableHead className="font-medium text-xs h-10 px-6 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort('descricao')}>
                                    <div className="flex items-center">Descrição {getSortIcon('descricao')}</div>
                                </TableHead>
                                <TableHead className="font-medium text-xs h-10 cursor-pointer hover:text-foreground transition-colors hidden md:table-cell" onClick={() => toggleSort('tipo')}>
                                    <div className="flex items-center">Perfil {getSortIcon('tipo')}</div>
                                </TableHead>
                                <TableHead className="font-medium text-xs h-10 hidden md:table-cell">Categoria</TableHead>
                                <TableHead className="font-medium text-xs h-10 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort('data_vencimento')}>
                                    <div className="flex items-center">Recebimento {getSortIcon('data_vencimento')}</div>
                                </TableHead>
                                <TableHead className="font-medium text-xs h-10">Status</TableHead>
                                <TableHead className="font-medium text-xs h-10 text-right px-6 cursor-pointer hover:text-foreground transition-colors" onClick={() => toggleSort('valor')}>
                                    <div className="flex items-center justify-end">Valor {getSortIcon('valor')}</div>
                                </TableHead>
                                <TableHead className="font-medium text-xs h-10 text-right px-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell className="text-right px-6"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                        <TableCell className="text-right px-6"><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Nenhuma receita encontrada para {monthName}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((transaction) => (
                                    <TableRow key={transaction.id} className="border-neux-1/5 hover:bg-zinc-900/5 dark:hover:bg-zinc-100/5 transition-colors">
                                        <TableCell className="font-medium px-6 py-4">
                                            {transaction.descricao}
                                            {transaction.total_parcelas && transaction.total_parcelas > 1 && (
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({transaction.parcela_atual}/{transaction.total_parcelas})
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge className={`${transaction.tipo === 'PJ'
                                                ? 'bg-orange-600/10 text-orange-600 dark:text-orange-400'
                                                : 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
                                                } border-none px-2 py-0 h-5 text-[10px]`}>
                                                {transaction.tipo}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                                            {transaction.categoria?.nome || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatDate(transaction.data_vencimento)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                                        <TableCell className="text-right font-bold text-emerald-500 px-6">
                                            {formatCurrency(transaction.valor)}
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-1">
                                                <EditTransactionDialog transaction={transaction} onSuccess={refresh} />
                                                <DeleteTransactionDialog transaction={transaction} onSuccess={refresh} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Paginação */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-neux-1/5">
                        <p className="text-xs text-muted-foreground">
                            Mostrando <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> a <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> de <span className="font-medium">{totalCount}</span> resultados
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-none bg-zinc-900/5 dark:bg-zinc-100/10"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1 overflow-x-auto max-w-[60vw] sm:max-w-none">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "h-8 w-8 p-0 text-xs border-none",
                                            currentPage === page
                                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                : "bg-zinc-900/5 dark:bg-zinc-100/10 hover:bg-zinc-900/10 dark:hover:bg-zinc-100/20"
                                        )}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-none bg-zinc-900/5 dark:bg-zinc-100/10"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
