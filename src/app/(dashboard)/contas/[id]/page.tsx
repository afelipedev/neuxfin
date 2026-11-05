"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, ChevronLeft, ChevronRight, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn, formatCurrency, parseLocalDate } from "@/lib/utils"
import { useAccountStatement } from "@/features/bank-accounts/hooks/use-account-statement"
import { accountIconMap } from "@/features/bank-accounts/components/bank-accounts-balance"
import { deriveStatus } from "@/features/bank-accounts/services/balances"
import { SettleTransactionDialog } from "@/features/transactions/components/settle-transaction-dialog"
import { DataTablePagination, usePaginatedList } from "@/components/data-table-pagination"
import { TransferDialog } from "@/features/bank-accounts/components/transfer-dialog"
import { DeleteTransferButton } from "@/features/bank-accounts/components/delete-transfer-button"

const formatDay = (iso: string) => format(parseLocalDate(iso), "dd MMM", { locale: ptBR }).toUpperCase()

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "pos" | "neg" | "auto" }) {
    const color =
        tone === "pos" ? "text-brand-2"
            : tone === "neg" ? "text-rose-500"
                : value >= 0 ? "text-foreground" : "text-rose-500"
    return (
        <Card className="border-none glass-card">
            <CardContent className="p-5 space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className={cn("text-xl font-black tracking-tighter font-display tabular-nums", color)}>
                    {formatCurrency(value)}
                </p>
            </CardContent>
        </Card>
    )
}

export default function AccountStatementPage() {
    const { id } = useParams<{ id: string }>()
    const [month, setMonth] = React.useState(new Date().getMonth() + 1)
    const [year, setYear] = React.useState(new Date().getFullYear())
    const { account, loading, error, statement, saldoAtual, emAberto } = useAccountStatement(id, month, year)

    const shiftMonth = (delta: number) => {
        const target = new Date(year, month - 1 + delta, 1)
        setMonth(target.getMonth() + 1)
        setYear(target.getFullYear())
    }

    // Mais recentes primeiro na exibição; saldo corrido já calculado em ordem cronológica
    const rows = React.useMemo(() => [...statement.rows].reverse(), [statement.rows])
    const extrato = usePaginatedList(rows, 10, `${month}-${year}`)
    const abertos = usePaginatedList(emAberto, 5, `${month}-${year}`)

    if (!loading && !error && !account) {
        return (
            <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
                <p className="text-muted-foreground">Conta não encontrada.</p>
                <Button asChild variant="outline"><Link href="/dashboard">Voltar ao dashboard</Link></Button>
            </div>
        )
    }

    const Icon = account ? accountIconMap[account.tipo] || Wallet : Wallet

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <Button asChild variant="ghost" size="icon" className="shrink-0" aria-label="Voltar ao dashboard">
                        <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div
                        className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", !account?.cor && "bg-brand-1/10 text-brand-1")}
                        style={account?.cor ? { backgroundColor: `${account.cor}15`, color: account.cor } : undefined}
                    >
                        <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        {loading && !account ? (
                            <Skeleton className="h-8 w-48 rounded-lg" />
                        ) : (
                            <h1 className="text-3xl font-black tracking-tighter font-display truncate">{account?.nome}</h1>
                        )}
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">
                            {account?.instituicao || account?.tipo} · Saldo hoje{" "}
                            <span className={cn("tabular-nums", saldoAtual >= 0 ? "text-brand-2" : "text-rose-500")}>
                                {formatCurrency(saldoAtual)}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                <TransferDialog defaultOrigemId={id} />
                <div className="flex items-center bg-secondary/30 dark:bg-zinc-100/5 rounded-xl border border-border px-2 w-full sm:w-auto justify-between">
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-[10px] uppercase font-black tracking-widest px-2 min-w-[120px] text-center">
                        {format(new Date(year, month - 1), "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
                </div>
            </div>

            {error && <p className="text-sm text-rose-500">Erro ao carregar extrato: {error}</p>}

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard label="Saldo anterior" value={statement.saldo_anterior} tone="auto" />
                <StatCard label="Entradas" value={statement.entradas} tone="pos" />
                <StatCard label="Saídas" value={statement.saidas} tone="neg" />
                <StatCard label="Saldo final do mês" value={statement.saldo_final} tone="auto" />
            </div>

            <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Extrato</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pt-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Data</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Descrição</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest hidden md:table-cell">Categoria</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Valor</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Saldo</TableHead>
                                    <TableHead className="w-12 px-4"><span className="sr-only">Ações</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-[10px] uppercase font-black tracking-widest opacity-50 italic">Carregando...</TableCell>
                                    </TableRow>
                                ) : extrato.pageItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-[10px] uppercase font-black tracking-widest opacity-50 italic">
                                            Nenhuma movimentação liquidada neste mês
                                        </TableCell>
                                    </TableRow>
                                ) : extrato.pageItems.map(({ tx, data, valor_assinado, saldo_apos }) => (
                                    <TableRow key={tx.id} className="border-border">
                                        <TableCell className="px-6 text-[11px] font-semibold text-muted-foreground tabular-nums">{formatDay(data)}</TableCell>
                                        <TableCell className="font-bold text-[13px] whitespace-normal">{tx.descricao}</TableCell>
                                        <TableCell className="text-[11px] text-muted-foreground hidden md:table-cell">{tx.categoria?.nome || "-"}</TableCell>
                                        <TableCell className={cn("text-right font-black text-sm tabular-nums", valor_assinado >= 0 ? "text-brand-2" : "text-rose-500")}>
                                            {valor_assinado >= 0 ? "+" : "−"} {formatCurrency(Math.abs(valor_assinado))}
                                        </TableCell>
                                        <TableCell className={cn("text-right text-sm font-semibold tabular-nums", saldo_apos >= 0 ? "text-foreground" : "text-rose-500")}>
                                            {formatCurrency(saldo_apos)}
                                        </TableCell>
                                        <TableCell className="px-4 text-right">
                                            {tx.origem === "transferencia" && <DeleteTransferButton transferId={tx.ref_id} />}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {!loading && (
                        <DataTablePagination
                            page={extrato.page}
                            pageSize={extrato.pageSize}
                            totalCount={extrato.totalCount}
                            onPageChange={extrato.setPage}
                            onPageSizeChange={extrato.setPageSize}
                        />
                    )}
                </CardContent>
            </Card>

            <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl">
                <CardHeader className="p-6 pb-2">
                    <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        Em aberto até o fim do mês (não afetam o saldo)
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {emAberto.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/60 italic py-4">Nenhum lançamento em aberto.</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {abertos.pageItems.map(tx => {
                                const status = deriveStatus(tx)
                                const isReceita = tx.tipo_transacao === "receita"
                                return (
                                    <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm truncate">{tx.descricao}</p>
                                            <p className={cn("text-[10px] uppercase font-black tracking-widest", status === "atrasado" ? "text-rose-500" : "text-muted-foreground/60")}>
                                                Vence {formatDay(tx.data_vencimento)}{status === "atrasado" ? " · atrasado" : ""}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={cn("font-black text-sm tabular-nums", isReceita ? "text-brand-2" : "text-rose-500")}>
                                                {isReceita ? "+" : "−"} {formatCurrency(Number(tx.valor))}
                                            </span>
                                            <SettleTransactionDialog transaction={tx} />
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </CardContent>
                <DataTablePagination
                    page={abertos.page}
                    pageSize={abertos.pageSize}
                    totalCount={abertos.totalCount}
                    onPageChange={abertos.setPage}
                    onPageSizeChange={abertos.setPageSize}
                />
            </Card>
        </div>
    )
}
