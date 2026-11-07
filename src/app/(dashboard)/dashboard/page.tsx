"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Download, Inbox } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
    IconTile,
    MonthStepper,
    PageHeader,
    ProfileBadge,
    SectionCard,
    TransactionStatusBadge,
} from "@/components/ds"
import {
    SummaryCards,
    QuickBalanceDetail,
    UpcomingPayments,
    AlertCard,
} from "@/features/dashboard/components/summary"
import { useDashboardAlerts } from "@/features/dashboard/hooks/use-dashboard-alerts"
import { NewTransactionMenu } from "@/features/transactions/components/new-transaction-menu"
import { exportTransactionsXlsx } from "@/features/transactions/services/export"
import { CashFlowChart } from "@/features/dashboard/components/cash-flow-chart"
import { useTransactions, useDashboardStats, useCashFlowData } from "@/features/transactions/hooks/use-transactions"
import { AllTransactionsModal } from "@/features/transactions/components/all-transactions-modal"
import { BankAccountsBalance } from "@/features/bank-accounts/components/bank-accounts-balance"
import { deriveStatus } from "@/features/bank-accounts/services/balances"
import { DataTablePagination } from "@/components/data-table-pagination"
import { getErrorMessage, parseLocalDate } from "@/lib/utils"

export default function DashboardPage() {
    const [month, setMonth] = React.useState(new Date().getMonth() + 1)
    const [year, setYear] = React.useState(new Date().getFullYear())
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSize] = React.useState(10)

    const changeMonth = (m: number, y: number) => {
        setMonth(m)
        setYear(y)
        setPage(1)
    }

    const filters = React.useMemo(() => ({ month, year, page, pageSize }), [month, year, page, pageSize])
    const { transactions, totalCount, loading: loadingTransactions } = useTransactions(filters)
    const { stats, loading: loadingStats } = useDashboardStats(filters)
    const { data: cashFlowData, loading: loadingCashFlow } = useCashFlowData(12, true)

    // Alerta de saldo previsto negativo só faz sentido para o mês corrente
    const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear()
    const { upcoming, alerts, loading: loadingAlerts } = useDashboardAlerts(
        isCurrentMonth && !loadingStats ? stats.saldo_previsto : undefined
    )

    const [exporting, setExporting] = React.useState(false)
    const handleExport = async () => {
        try {
            setExporting(true)
            const total = await exportTransactionsXlsx(
                { month, year },
                `transacoes_${year}_${String(month).padStart(2, "0")}`
            )
            toast.success(`${total} transação(ões) exportada(s)`)
        } catch (e) {
            toast.error(`Erro ao exportar transações: ${getErrorMessage(e)}`)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="min-w-0 space-y-6 lg:col-span-8 lg:space-y-8">
                <PageHeader
                    title="Dashboard"
                    description="Visão geral da sua saúde financeira"
                    actions={
                        <>
                            <MonthStepper month={month} year={year} onChange={changeMonth} />
                            <NewTransactionMenu className="hidden md:inline-flex" />
                        </>
                    }
                />

                <SummaryCards stats={stats} loading={loadingStats} />

                <SectionCard
                    title="Fluxo de caixa mensal"
                    description="Últimos 12 meses, por competência"
                    actions={
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-1" aria-hidden="true" />Receitas</span>
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-5" aria-hidden="true" />Despesas</span>
                        </div>
                    }
                    contentClassName="h-[240px] px-2 sm:h-[320px] sm:px-4 lg:h-[360px]"
                >
                    <CashFlowChart data={cashFlowData} loading={loadingCashFlow} />
                </SectionCard>

                <SectionCard
                    flush
                    className="pb-0"
                    title="Últimas movimentações"
                    actions={
                        <>
                            <Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting}>
                                <Download /> {exporting ? "Exportando..." : "Exportar"}
                            </Button>
                            <AllTransactionsModal
                                initialMonth={month}
                                initialYear={year}
                                trigger={
                                    <Button variant="ghost" size="sm" className="text-brand-1 hover:text-brand-1">
                                        Ver todas <ChevronRight />
                                    </Button>
                                }
                            />
                        </>
                    }
                >
                    {loadingTransactions ? (
                        <div className="space-y-3 px-4 pb-5 sm:px-6">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}
                        </div>
                    ) : transactions.length === 0 ? (
                        <EmptyState icon={Inbox} title="Nenhuma transação neste mês" description="Use “Nova transação” para lançar receitas e despesas." />
                    ) : (
                        <>
                            {/* Mobile */}
                            <ul className="stagger divide-y border-t md:hidden">
                                {transactions.map(t => {
                                    const isReceita = t.tipo_transacao === "receita"
                                    return (
                                        <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                                            <IconTile icon={isReceita ? ArrowUpCircle : ArrowDownCircle} tone={isReceita ? "success" : "danger"} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{t.descricao}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {format(parseLocalDate(t.data_vencimento), "dd MMM", { locale: ptBR })} · {t.categoria?.nome || "Geral"}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-1">
                                                <Amount value={t.valor} kind={t.tipo_transacao} className="text-sm" />
                                                <TransactionStatusBadge status={deriveStatus(t)} kind={t.tipo_transacao} />
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>

                            {/* Desktop */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-6">Descrição</TableHead>
                                            <TableHead>Perfil</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="px-6 text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map(t => {
                                            const isReceita = t.tipo_transacao === "receita"
                                            return (
                                                <TableRow key={t.id}>
                                                    <TableCell className="px-6 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <IconTile icon={isReceita ? ArrowUpCircle : ArrowDownCircle} tone={isReceita ? "success" : "danger"} size="sm" />
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium">{t.descricao}</p>
                                                                <p className="truncate text-xs text-muted-foreground">{t.categoria?.nome || "Geral"}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><ProfileBadge tipo={t.tipo} /></TableCell>
                                                    <TableCell className="text-muted-foreground tabular-nums">
                                                        {format(parseLocalDate(t.data_vencimento), "dd MMM yyyy", { locale: ptBR })}
                                                    </TableCell>
                                                    <TableCell><TransactionStatusBadge status={deriveStatus(t)} kind={t.tipo_transacao} /></TableCell>
                                                    <TableCell className="px-6 text-right"><Amount value={t.valor} kind={t.tipo_transacao} /></TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}

                    {!loadingTransactions && (
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

            <aside className="stagger min-w-0 space-y-6 lg:col-span-4">
                <QuickBalanceDetail stats={stats} loading={loadingStats} />
                <BankAccountsBalance />
                <UpcomingPayments items={upcoming} loading={loadingAlerts} />
                <AlertCard alerts={alerts} loading={loadingAlerts} />
                <p className="text-center text-xs text-muted-foreground">
                    Precisa de mais detalhes? <Link href="/relatorios" className="font-medium text-brand-1 underline-offset-4 hover:underline">Ver relatórios</Link>
                </p>
            </aside>
        </div>
    )
}
