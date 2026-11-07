"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Inbox, Pencil, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Amount, EmptyState, IconTile, MonthStepper, PageHeader, SectionCard, StatCard, StatGrid, ToneBadge } from "@/components/ds"
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
import { AdjustBalanceDialog } from "@/features/bank-accounts/components/adjust-balance-dialog"
import { RemoveAdjustmentButton } from "@/features/bank-accounts/components/remove-adjustment-button"
import type { StatementTx } from "@/features/bank-accounts/services/balances"

/** Ações por linha do extrato: transferência pode ser excluída; ajuste, desfeito. */
function RowActions({ tx }: { tx: StatementTx }) {
    if (tx.origem === "transferencia") {
        return (
            <span className="inline-flex items-center">
                <TransferDialog
                    transferId={tx.ref_id}
                    trigger={
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Editar transferência">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    }
                />
                <DeleteTransferButton transferId={tx.ref_id} />
            </span>
        )
    }
    if (tx.origem === "ajuste") return <RemoveAdjustmentButton adjustmentId={tx.ref_id} />
    return null
}

const formatDay = (iso: string) => format(parseLocalDate(iso), "dd MMM", { locale: ptBR })

export default function AccountStatementPage() {
    const { id } = useParams<{ id: string }>()
    const [month, setMonth] = React.useState(new Date().getMonth() + 1)
    const [year, setYear] = React.useState(new Date().getFullYear())
    const { account, loading, error, statement, saldoAtual, emAberto, balanceAt } = useAccountStatement(id, month, year)

    // Mais recentes primeiro na exibição; saldo corrido já calculado em ordem cronológica
    const rows = React.useMemo(() => [...statement.rows].reverse(), [statement.rows])
    const extrato = usePaginatedList(rows, 10, `${month}-${year}`)
    const abertos = usePaginatedList(emAberto, 5, `${month}-${year}`)

    if (!loading && !error && !account) {
        return (
            <EmptyState
                title="Conta não encontrada"
                action={<Button asChild variant="outline"><Link href="/dashboard">Voltar ao dashboard</Link></Button>}
            />
        )
    }

    const Icon = account ? accountIconMap[account.tipo] || Wallet : Wallet

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                back={{ href: "/dashboard", label: "Voltar ao dashboard" }}
                leading={<IconTile icon={Icon} color={account?.cor} size="lg" className="hidden sm:inline-flex" />}
                title={account?.nome ?? "Carregando…"}
                description={
                    <>
                        <span className="capitalize">{account?.instituicao || account?.tipo}</span> · Saldo hoje{" "}
                        <Amount value={saldoAtual} kind="auto" />
                    </>
                }
                actions={
                    <>
                        <TransferDialog defaultOrigemId={id} />
                        {account && <AdjustBalanceDialog contaId={id} balanceAt={balanceAt} />}
                        <MonthStepper month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
                    </>
                }
            />

            {error && <p role="alert" className="text-sm text-destructive">Erro ao carregar extrato: {error}</p>}

            <StatGrid columns={4}>
                <StatCard label="Saldo anterior" amount={statement.saldo_anterior} tone={statement.saldo_anterior < 0 ? "danger" : "neutral"} loading={loading} />
                <StatCard label="Entradas" amount={statement.entradas} tone="success" loading={loading} />
                <StatCard label="Saídas" amount={statement.saidas} tone="danger" loading={loading} />
                <StatCard label="Saldo final do mês" amount={statement.saldo_final} tone={statement.saldo_final < 0 ? "danger" : "neutral"} loading={loading} />
            </StatGrid>

            <SectionCard flush className="pb-0" title="Extrato">
                {loading ? (
                    <div className="space-y-3 px-4 pb-5 sm:px-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : extrato.pageItems.length === 0 ? (
                    <EmptyState icon={Inbox} title="Nenhuma movimentação liquidada neste mês" />
                ) : (
                    <>
                        <ul className="stagger divide-y border-t md:hidden">
                            {extrato.pageItems.map(({ tx, data, valor_assinado, saldo_apos }) => (
                                <li key={tx.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-center gap-1.5 text-sm font-medium">
                                            <span className="truncate">{tx.descricao}</span>
                                            {tx.origem === "ajuste" && <ToneBadge tone="info">Ajuste</ToneBadge>}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">{formatDay(data)} · Saldo {formatCurrency(saldo_apos)}</p>
                                    </div>
                                    <Amount value={valor_assinado} kind="auto" signed className="text-sm" />
                                    <RowActions tx={tx} />
                                </li>
                            ))}
                        </ul>
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="px-6">Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                        <TableHead className="w-20 px-4"><span className="sr-only">Ações</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {extrato.pageItems.map(({ tx, data, valor_assinado, saldo_apos }) => (
                                        <TableRow key={tx.id}>
                                            <TableCell className="px-6 text-muted-foreground tabular-nums">{formatDay(data)}</TableCell>
                                            <TableCell className="whitespace-normal font-medium">
                                                {tx.descricao}
                                                {tx.origem === "ajuste" && <ToneBadge tone="info" className="ml-2">Ajuste</ToneBadge>}
                                            </TableCell>
                                            <TableCell className="hidden text-muted-foreground lg:table-cell">{tx.categoria?.nome || "—"}</TableCell>
                                            <TableCell className="text-right"><Amount value={valor_assinado} kind="auto" signed /></TableCell>
                                            <TableCell className={cn("text-right tabular-nums", saldo_apos < 0 && "text-destructive")}>{formatCurrency(saldo_apos)}</TableCell>
                                            <TableCell className="px-4 text-right">
                                                <RowActions tx={tx} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
                {!loading && (
                    <DataTablePagination
                        page={extrato.page}
                        pageSize={extrato.pageSize}
                        totalCount={extrato.totalCount}
                        onPageChange={extrato.setPage}
                        onPageSizeChange={extrato.setPageSize}
                    />
                )}
            </SectionCard>

            <SectionCard flush className="pb-0" title="Em aberto até o fim do mês" description="Não afetam o saldo até serem liquidados">
                {emAberto.length === 0 ? (
                    <p className="px-4 pb-5 text-sm text-muted-foreground sm:px-6">Nenhum lançamento em aberto.</p>
                ) : (
                    <ul className="divide-y border-t">
                        {abertos.pageItems.map(tx => {
                            const status = deriveStatus(tx)
                            return (
                                <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{tx.descricao}</p>
                                        <p className={cn("text-xs", status === "atrasado" ? "font-medium text-destructive" : "text-muted-foreground")}>
                                            Vence {formatDay(tx.data_vencimento)}{status === "atrasado" ? " · atrasado" : ""}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Amount value={tx.valor} kind={tx.tipo_transacao} className="text-sm" />
                                        <SettleTransactionDialog transaction={tx} />
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
                <DataTablePagination
                    page={abertos.page}
                    pageSize={abertos.pageSize}
                    totalCount={abertos.totalCount}
                    onPageChange={abertos.setPage}
                    onPageSizeChange={abertos.setPageSize}
                />
            </SectionCard>
        </div>
    )
}
