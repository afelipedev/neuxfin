"use client"

import * as React from "react"
import Link from "next/link"
import {
    AlertCircle,
    ArrowDown,
    ArrowDownRight,
    ArrowUp,
    ArrowUpDown,
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    Clock,
    CreditCard,
    Inbox,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Amount,
    EmptyState,
    MonthStepper,
    PageHeader,
    ProfileBadge,
    SectionCard,
    StatCard,
    StatGrid,
    TransactionStatusBadge,
} from "@/components/ds"
import { DataTablePagination } from "@/components/data-table-pagination"
import { deriveStatus } from "@/features/bank-accounts/services/balances"
import { useCategories } from "@/features/settings/hooks/use-categories"
import { parseLocalDate } from "@/lib/utils"
import { useTransactions, useTransactionStats } from "../hooks/use-transactions"
import type { Transaction } from "../services/transactions"
import { DeleteTransactionDialog } from "./delete-transaction-dialog"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import { ExportTransactionsButton } from "./export-transactions-button"
import { RecurrenceBadge } from "./recurrence-badge"
import { ReplicateDialog } from "./replicate-dialog"
import { SettleTransactionDialog } from "./settle-transaction-dialog"
import { TransactionForm } from "./transaction-form"

type Kind = "receita" | "despesa"
type TipoFilter = "todos" | "PF" | "PJ"
type StatusFilter = "todos" | "liquidado" | "pendente" | "atrasado"

const COPY: Record<Kind, { title: string; description: string; dateLabel: string; empty: string; paid: string }> = {
    despesa: {
        title: "Despesas",
        description: "Controle suas saídas, custos fixos e variáveis",
        dateLabel: "Vencimento",
        empty: "Nenhuma despesa",
        paid: "Pago",
    },
    receita: {
        title: "Receitas",
        description: "Controle suas entradas e planeje seu faturamento",
        dateLabel: "Recebimento",
        empty: "Nenhuma receita",
        paid: "Recebido",
    },
}

const formatDate = (iso: string) => parseLocalDate(iso).toLocaleDateString("pt-BR")

/** Página de listagem de receitas ou despesas (mesmo layout, filtros e ações). */
export function TransactionsPage({ kind }: { kind: Kind }) {
    const copy = COPY[kind]
    const now = new Date()
    const [month, setMonth] = React.useState(now.getMonth() + 1)
    const [year, setYear] = React.useState(now.getFullYear())
    const [tipoFilter, setTipoFilter] = React.useState<TipoFilter>("todos")
    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("todos")
    const [categoriaFilter, setCategoriaFilter] = React.useState("todas")
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(10)
    const [sortBy, setSortBy] = React.useState("data_vencimento")
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")

    const filters = {
        month,
        year,
        tipo_transacao: kind,
        tipo: tipoFilter === "todos" ? undefined : tipoFilter,
        status: statusFilter === "todos" ? undefined : statusFilter,
        categoria_id: categoriaFilter === "todas" ? undefined : categoriaFilter,
        sortBy,
        sortOrder,
    }

    const { transactions, totalCount, loading, refresh } = useTransactions({ ...filters, page, pageSize })
    const { stats, loading: statsLoading } = useTransactionStats({ month, year, tipo_transacao: kind })
    const { categories } = useCategories()
    const kindCategories = categories.filter((c: { tipo: string }) => c.tipo === kind)

    const monthName = new Date(year, month - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1) }

    const toggleSort = (field: string) => {
        if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        else { setSortBy(field); setSortOrder("desc") }
    }

    const sortHead = (field: string, children: React.ReactNode, className?: string) => {
        const Icon = sortBy !== field ? ArrowUpDown : sortOrder === "asc" ? ArrowUp : ArrowDown
        return (
            <TableHead className={className} aria-sort={sortBy === field ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}>
                <button
                    type="button"
                    onClick={() => toggleSort(field)}
                    className="inline-flex items-center gap-1.5 uppercase hover:text-foreground"
                >
                    {children}
                    <Icon className="h-3 w-3" aria-hidden="true" />
                </button>
            </TableHead>
        )
    }

    const percentLiquidado = stats.total > 0 ? (stats.liquidado / stats.total) * 100 : 0

    const actions = (t: Transaction) => (
        <div className="flex justify-end gap-1">
            {/* Compra no cartão é paga pela fatura, não individualmente */}
            {!t.cartao_id && <SettleTransactionDialog transaction={t} onSuccess={refresh} />}
            <EditTransactionDialog transaction={t} onSuccess={refresh} />
            <DeleteTransactionDialog transaction={t} onSuccess={refresh} />
        </div>
    )

    const meta = (t: Transaction) => (
        <>
            {t.total_parcelas && t.total_parcelas > 1 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({t.parcela_atual}/{t.total_parcelas})
                </span>
            )}
            <RecurrenceBadge transaction={t} />
            {t.cartao_id && (
                <Link
                    href={`/cartoes/${t.cartao_id}`}
                    className="ml-2 inline-flex items-center gap-1 text-2xs font-semibold text-muted-foreground hover:text-foreground"
                >
                    <CreditCard className="h-3 w-3" aria-hidden="true" />
                    {t.cartao?.nome ?? "Cartão"}
                </Link>
            )}
        </>
    )

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                title={copy.title}
                description={copy.description}
                actions={
                    <>
                        <MonthStepper
                            month={month}
                            year={year}
                            onChange={(m, y) => { setMonth(m); setYear(y); setPage(1) }}
                        />
                        <TransactionForm type={kind} onSuccess={refresh} />
                    </>
                }
            />

            {kind === "despesa" ? (
                <StatGrid columns={4}>
                    <StatCard label="Total do mês" amount={stats.total} hint="Comprometimento total" icon={ArrowDownRight} tone="danger" loading={statsLoading} />
                    <StatCard label="Total pago" amount={stats.liquidado} hint="Liquidado no mês" icon={CheckCircle2} tone="success" loading={statsLoading} />
                    <StatCard label="Pendente" amount={stats.pendente} hint="A vencer" icon={Clock} tone="warning" loading={statsLoading} />
                    <StatCard
                        label="Atrasado"
                        amount={stats.atrasado}
                        hint={stats.atrasado > 0 ? "Atenção: pagamento vencido" : "Nada em atraso"}
                        icon={AlertCircle}
                        tone={stats.atrasado > 0 ? "danger" : "neutral"}
                        loading={statsLoading}
                    />
                </StatGrid>
            ) : (
                <StatGrid columns={3}>
                    <StatCard label="Total do mês" amount={stats.total} hint="Receitas previstas" icon={ArrowUpRight} tone="success" loading={statsLoading} />
                    <StatCard label="Recebido" amount={stats.liquidado} hint={`${percentLiquidado.toFixed(0)}% do previsto`} icon={CheckCircle2} tone="success" loading={statsLoading} />
                    <StatCard label="A receber" amount={stats.pendente} hint="Ainda pendente" icon={CalendarClock} tone="info" loading={statsLoading} />
                </StatGrid>
            )}

            <SectionCard flush className="gap-0 pb-0">
                {/* Filtros */}
                <div className="flex flex-col gap-3 border-b px-4 pb-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        <Select value={tipoFilter} onValueChange={resetPage((v: string) => setTipoFilter(v as TipoFilter))}>
                            <SelectTrigger className="w-full sm:w-[150px]" aria-label="Filtrar por perfil">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">PF e PJ</SelectItem>
                                <SelectItem value="PF">Apenas PF</SelectItem>
                                <SelectItem value="PJ">Apenas PJ</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={resetPage((v: string) => setStatusFilter(v as StatusFilter))}>
                            <SelectTrigger className="w-full sm:w-[150px]" aria-label="Filtrar por status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os status</SelectItem>
                                <SelectItem value="liquidado">{copy.paid}</SelectItem>
                                <SelectItem value="pendente">Pendente</SelectItem>
                                <SelectItem value="atrasado">Atrasado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoriaFilter} onValueChange={resetPage(setCategoriaFilter)}>
                            <SelectTrigger className="col-span-2 w-full sm:w-[180px]" aria-label="Filtrar por categoria">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todas">Todas as categorias</SelectItem>
                                {kindCategories.map((cat: { id: string; nome: string }) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <ReplicateDialog transactions={transactions} onSuccess={refresh} />
                        <ExportTransactionsButton
                            filters={filters}
                            fileName={`${kind}s_${year}_${String(month).padStart(2, "0")}`}
                            label="Exportar"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3 p-4 sm:p-6">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : transactions.length === 0 ? (
                    <EmptyState
                        icon={Inbox}
                        title={`${copy.empty} em ${monthName}`}
                        description="Ajuste os filtros ou crie um novo lançamento."
                    />
                ) : (
                    <>
                        {/* Mobile: lista em cartões */}
                        <ul className="stagger divide-y md:hidden">
                            {transactions.map(t => (
                                <li key={t.id} className="space-y-2 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="min-w-0 font-medium leading-snug">
                                            {t.descricao}
                                            {meta(t)}
                                        </p>
                                        <Amount value={t.valor} kind={kind} className="text-sm" />
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <TransactionStatusBadge status={deriveStatus(t)} kind={kind} />
                                            <ProfileBadge tipo={t.tipo} />
                                            <span>{formatDate(t.data_vencimento)}</span>
                                            {t.categoria?.nome && <span className="truncate">· {t.categoria.nome}</span>}
                                        </div>
                                        <div className="-mr-2 shrink-0">{actions(t)}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Desktop: tabela */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {sortHead("descricao", "Descrição", "px-6")}
                                        {sortHead("tipo", "Perfil")}
                                        <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                                        {sortHead("data_vencimento", copy.dateLabel)}
                                        <TableHead>Status</TableHead>
                                        {sortHead("valor", "Valor", "text-right")}
                                        <TableHead className="px-6 text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell className="whitespace-normal px-6 py-3 font-medium">
                                                {t.descricao}
                                                {meta(t)}
                                            </TableCell>
                                            <TableCell><ProfileBadge tipo={t.tipo} /></TableCell>
                                            <TableCell className="hidden text-muted-foreground lg:table-cell">{t.categoria?.nome || "—"}</TableCell>
                                            <TableCell className="text-muted-foreground tabular-nums">{formatDate(t.data_vencimento)}</TableCell>
                                            <TableCell><TransactionStatusBadge status={deriveStatus(t)} kind={kind} /></TableCell>
                                            <TableCell className="text-right"><Amount value={t.valor} kind={kind} /></TableCell>
                                            <TableCell className="px-6">{actions(t)}</TableCell>
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
                    />
                )}
            </SectionCard>
        </div>
    )
}
