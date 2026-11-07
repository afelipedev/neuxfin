"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronRight, Download, Inbox, RotateCcw } from "lucide-react"
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
import { toast } from "sonner"
import { exportTransactionsXlsx } from "../services/export"
import { DataTablePagination } from "@/components/data-table-pagination"
import { getErrorMessage, parseLocalDate } from "@/lib/utils"
import { Amount, EmptyState, MonthStepper, ProfileBadge, SectionCard } from "@/components/ds"
import { Skeleton } from "@/components/ui/skeleton"

interface AllTransactionsModalProps {
    initialMonth: number
    initialYear: number
    trigger?: React.ReactNode
}

interface CategorySlice {
    name: string
    value: number
    color?: string
}

export function AllTransactionsModal({ initialMonth, initialYear, trigger }: AllTransactionsModalProps) {
    const [open, setOpen] = React.useState(false)
    const [month, setMonth] = React.useState(initialMonth)
    const [year, setYear] = React.useState(initialYear)
    const [type, setType] = React.useState<'todos' | 'PF' | 'PJ'>('todos')
    const [nature, setNature] = React.useState<'todos' | 'receita' | 'despesa'>('todos')
    const [category, setCategory] = React.useState<string>('todos')
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(5)

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
    const [chartData, setChartData] = React.useState<CategorySlice[]>([])
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
            const summary = allTransactions.reduce<Record<string, CategorySlice>>((acc, t) => {
                const name = t.categoria?.nome || 'Geral'
                if (!acc[name]) {
                    acc[name] = { name, value: 0, color: t.categoria?.cor }
                }
                acc[name].value += Number(t.valor)
                return acc
            }, {})
            setChartData(Object.values(summary))
        }
    }, [allTransactions])

    const saldoFiltro = allTransactions.reduce(
        (acc, t) => acc + (t.tipo_transacao === "receita" ? Number(t.valor) : -Number(t.valor)),
        0
    )

    const reset = () => {
        setMonth(initialMonth)
        setYear(initialYear)
        setType("todos")
        setNature("todos")
        setCategory("todos")
        setPage(1)
    }

    const handleExport = async () => {
        try {
            const total = await exportTransactionsXlsx(
                {
                    month: filters.month,
                    year: filters.year,
                    tipo: filters.tipo,
                    tipo_transacao: filters.tipo_transacao,
                    categoria_id: filters.categoria_id,
                },
                `relatorio_transacoes_${year}_${String(month).padStart(2, '0')}`
            )
            toast.success(`${total} transação(ões) exportada(s)`)
        } catch (e) {
            toast.error(`Erro ao exportar transações: ${getErrorMessage(e)}`)
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="text-brand-1 hover:text-brand-1">
                        Ver todas <ChevronRight />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="flex h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[90dvh] sm:max-w-[calc(100%-2rem)] xl:max-w-6xl">
                <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b p-4 pr-12 text-left sm:p-6 sm:pr-14">
                    <div className="space-y-1">
                        <DialogTitle className="text-lg sm:text-xl">Relatório detalhado</DialogTitle>
                        <DialogDescription>Todas as movimentações do período, com filtros</DialogDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0">
                        <Download /> <span className="hidden sm:inline">Exportar</span> XLSX
                    </Button>
                </DialogHeader>

                <div className="grid shrink-0 grid-cols-2 gap-2 border-b p-4 sm:grid-cols-3 sm:p-6 lg:grid-cols-5">
                    <MonthStepper
                        className="col-span-2 sm:col-span-1"
                        month={month}
                        year={year}
                        onChange={(m, y) => { setMonth(m); setYear(y); setPage(1) }}
                    />
                    <Select value={type} onValueChange={(v) => { setType(v as typeof type); setPage(1) }}>
                        <SelectTrigger className="w-full" aria-label="Perfil"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">PF e PJ</SelectItem>
                            <SelectItem value="PF">Pessoa física</SelectItem>
                            <SelectItem value="PJ">Pessoa jurídica</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={nature} onValueChange={(v) => { setNature(v as typeof nature); setPage(1) }}>
                        <SelectTrigger className="w-full" aria-label="Natureza"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="todos">Receitas e despesas</SelectItem>
                            <SelectItem value="receita">Receitas</SelectItem>
                            <SelectItem value="despesa">Despesas</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
                        <SelectTrigger className="w-full" aria-label="Categoria"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-[260px]">
                            <SelectItem value="todos">Todas as categorias</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" onClick={reset} className="w-full">
                        <RotateCcw /> Limpar filtros
                    </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-6">
                        <SectionCard title="Por categoria" className="lg:col-span-4" contentClassName="space-y-4">
                            <CategoryPieChart data={chartData} height={240} />
                            <div className="flex items-center justify-between rounded-lg bg-muted/60 p-3">
                                <span className="eyebrow">Saldo do filtro</span>
                                <Amount value={saldoFiltro} kind="auto" className="text-base" />
                            </div>
                        </SectionCard>

                        <SectionCard
                            flush
                            className="pb-0 lg:col-span-8"
                            title="Transações"
                            actions={<span className="text-xs text-muted-foreground tabular-nums">{totalCount} registros</span>}
                        >
                            {loading ? (
                                <div className="space-y-3 px-4 pb-5 sm:px-6">
                                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                                </div>
                            ) : transactions.length === 0 ? (
                                <EmptyState icon={Inbox} title="Nenhuma transação para este filtro" />
                            ) : (
                                <>
                                    <ul className="stagger divide-y border-t md:hidden">
                                        {transactions.map(t => (
                                            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{t.descricao}</p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {format(parseLocalDate(t.data_vencimento), "dd/MM/yy")} · {t.categoria?.nome || "Geral"} · {t.tipo}
                                                    </p>
                                                </div>
                                                <Amount value={t.valor} kind={t.tipo_transacao} className="text-sm" />
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">Descrição</TableHead>
                                                    <TableHead>Data</TableHead>
                                                    <TableHead>Perfil</TableHead>
                                                    <TableHead className="px-6 text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transactions.map(t => (
                                                    <TableRow key={t.id}>
                                                        <TableCell className="px-6 py-3">
                                                            <p className="font-medium">{t.descricao}</p>
                                                            <p className="text-xs text-muted-foreground">{t.categoria?.nome || "Geral"}</p>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground tabular-nums">
                                                            {format(parseLocalDate(t.data_vencimento), "dd/MM/yy")}
                                                        </TableCell>
                                                        <TableCell><ProfileBadge tipo={t.tipo} /></TableCell>
                                                        <TableCell className="px-6 text-right"><Amount value={t.valor} kind={t.tipo_transacao} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                            {!loading && (
                                <DataTablePagination
                                    page={page}
                                    pageSize={pageSize}
                                    totalCount={totalCount}
                                    onPageChange={setPage}
                                    onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
                                    pageSizeOptions={[5, 10, 20]}
                                />
                            )}
                        </SectionCard>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
