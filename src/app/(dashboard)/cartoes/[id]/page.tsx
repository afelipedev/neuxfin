"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Amount, EmptyState, MonthStepper, PageHeader, SectionCard, StatCard, StatGrid } from "@/components/ds"
import { CardThumb } from "@/features/credit-cards/components/card-thumb"
import { Progress } from "@/components/ui/progress"
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
import { DataTablePagination, usePaginatedList } from "@/components/data-table-pagination"
import { useCardsOverview } from "@/features/credit-cards/hooks/use-cards-overview"
import {
    invoiceDates,
    invoiceKeyForDate,
    type Invoice,
} from "@/features/credit-cards/services/invoices"
import { InvoiceStatusBadge } from "@/features/credit-cards/components/invoice-status-badge"
import { PayInvoiceDialog } from "@/features/credit-cards/components/pay-invoice-dialog"
import { ReverseInvoiceButton } from "@/features/credit-cards/components/reverse-invoice-button"
import { todayISO } from "@/features/bank-accounts/services/balances"

const formatDay = (iso: string) => format(parseLocalDate(iso), "dd/MM/yyyy")
const KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function CardInvoicePage() {
    const { id } = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const { cards, loading, error, refresh } = useCardsOverview()
    const card = cards.find(c => c.id === id)

    const requestedKey = searchParams.get("fatura")
    const [selectedKey, setSelectedKey] = React.useState<string | null>(
        requestedKey && KEY_RE.test(requestedKey) ? requestedKey : null
    )

    // Padrão: fatura pendente de pagamento, senão a do ciclo atual
    const defaultKey = card
        ? card.fatura_pendente?.key ?? invoiceKeyForDate(todayISO(), card)
        : null
    const key = selectedKey ?? defaultKey

    const invoice: Invoice | null = React.useMemo(() => {
        if (!card || !key) return null
        const found = card.invoices.find(i => i.key === key)
        if (found) return found
        // Fatura sem compras: monta vazia para exibir as datas do ciclo
        const { fechamento, vencimento } = invoiceDates(key, card)
        const today = todayISO()
        const status: Invoice["status"] = today < fechamento
            ? (key <= invoiceKeyForDate(today, card) ? "aberta" : "futura")
            : "fechada"
        return { cartao_id: card.id, key, fechamento, vencimento, total: 0, em_aberto: 0, compras: [], pagamento: null, status }
    }, [card, key])

    const compras = usePaginatedList(invoice?.compras ?? [], 10, key ?? "")

    if (!loading && !error && !card) {
        return (
            <EmptyState
                title="Cartão não encontrado"
                action={<Button asChild variant="outline"><Link href="/cartoes">Voltar aos cartões</Link></Button>}
            />
        )
    }

    const limite = Number(card?.limite || 0)
    const uso = card && limite > 0 ? Math.min(100, Math.round((card.usado / limite) * 100)) : 0
    const [keyYear, keyMonth] = key ? key.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1]
    const pagoComRestante = invoice?.pagamento && invoice.em_aberto > 0

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                back={{ href: "/cartoes", label: "Voltar aos cartões" }}
                leading={<CardThumb color={card?.cor} brand={card?.bandeira} size="lg" className="hidden sm:flex" />}
                title={card?.nome ?? "Carregando…"}
                description={card ? `Fecha dia ${card.dia_fechamento} · Vence dia ${card.dia_vencimento}` : undefined}
                actions={
                    <MonthStepper
                        prefix="Fatura"
                        month={keyMonth}
                        year={keyYear}
                        disabled={!key}
                        onChange={(m, y) => setSelectedKey(`${y}-${String(m).padStart(2, "0")}`)}
                    />
                }
            />

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            {invoice && (
                <>
                    <StatGrid columns={4}>
                        <StatCard label="Total da fatura" amount={invoice.total} />
                        <StatCard label="Em aberto" amount={invoice.em_aberto} tone={invoice.em_aberto > 0 ? "warning" : "success"} />
                        <StatCard label="Fechamento" value={formatDay(invoice.fechamento)} size="sm" />
                        <StatCard label="Vencimento" value={formatDay(invoice.vencimento)} size="sm" />
                    </StatGrid>

                    <Card className="py-5">
                        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">Situação</span>
                                    <InvoiceStatusBadge status={invoice.status} />
                                </div>
                                {invoice.pagamento ? (
                                    <p className="text-sm text-muted-foreground">
                                        Paga em {formatDay(invoice.pagamento.data_pagamento)} com {invoice.pagamento.conta?.nome ?? "conta"} · {formatCurrency(Number(invoice.pagamento.valor))}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {invoice.status === "aberta" || invoice.status === "futura"
                                            ? "Fatura ainda aberta: novas compras até o fechamento entram nela."
                                            : invoice.em_aberto > 0 ? "Fatura fechada aguardando pagamento." : "Sem valores a pagar."}
                                    </p>
                                )}
                                {pagoComRestante && (
                                    <p className="text-sm text-warning">
                                        Há {formatCurrency(invoice.em_aberto)} em compras lançadas depois do pagamento. Estorne e pague novamente para incluí-las.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 [&>*]:w-full sm:[&>*]:w-auto">
                                {invoice.pagamento ? (
                                    <ReverseInvoiceButton pagamentoId={invoice.pagamento.id} onSuccess={refresh} />
                                ) : card && invoice.em_aberto > 0 && (
                                    <PayInvoiceDialog cardName={card.nome} invoice={invoice} onSuccess={refresh} />
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <SectionCard flush className="pb-0 lg:col-span-2" title="Compras da fatura">
                    {loading ? (
                        <div className="space-y-3 px-4 pb-5 sm:px-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
                    ) : compras.totalCount === 0 ? (
                        <EmptyState
                            title="Nenhuma compra nesta fatura"
                            description="Lance despesas escolhendo “Cartão de crédito” como forma de pagamento."
                        />
                    ) : (
                        <>
                            <ul className="stagger divide-y border-t md:hidden">
                                {compras.pageItems.map(c => (
                                    <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {c.descricao}
                                                {c.status === "liquidado" && <span className="ml-2 text-2xs font-semibold uppercase text-success">Paga</span>}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">{formatDay(c.data_vencimento)} · {c.categoria?.nome ?? "Sem categoria"}</p>
                                        </div>
                                        <Amount value={c.valor} className="text-sm" />
                                    </li>
                                ))}
                            </ul>
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="px-6">Data</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Categoria</TableHead>
                                            <TableHead className="px-6 text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {compras.pageItems.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell className="px-6 text-muted-foreground tabular-nums">{formatDay(c.data_vencimento)}</TableCell>
                                                <TableCell className="whitespace-normal font-medium">
                                                    {c.descricao}
                                                    {c.status === "liquidado" && <span className="ml-2 text-2xs font-semibold uppercase text-success">Paga</span>}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{c.categoria?.nome ?? "—"}</TableCell>
                                                <TableCell className="px-6 text-right"><Amount value={c.valor} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                    <DataTablePagination
                        page={compras.page}
                        pageSize={compras.pageSize}
                        totalCount={compras.totalCount}
                        onPageChange={compras.setPage}
                        onPageSizeChange={compras.setPageSize}
                    />
                </SectionCard>

                <SectionCard title="Limite" className="h-fit">
                    {limite > 0 && card ? (
                        <div className="space-y-4">
                            <Progress
                                value={uso}
                                aria-label={`Limite usado: ${uso}%`}
                                className="bg-muted"
                                indicatorClassName={uso >= 80 ? "bg-destructive" : "bg-primary"}
                            />
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between"><dt className="text-muted-foreground">Limite total</dt><dd className="font-semibold tabular-nums">{formatCurrency(limite)}</dd></div>
                                <div className="flex justify-between"><dt className="text-muted-foreground">Usado ({uso}%)</dt><dd className="font-semibold tabular-nums">{formatCurrency(card.usado)}</dd></div>
                                <div className="flex justify-between"><dt className="text-muted-foreground">Disponível</dt><dd className={cn("font-semibold tabular-nums", card.disponivel < 0 ? "text-destructive" : "text-success")}>{formatCurrency(card.disponivel)}</dd></div>
                            </dl>
                            <p className="text-xs text-muted-foreground">O limite usado inclui parcelas futuras ainda não pagas.</p>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Informe o limite do cartão em <Link href="/configuracoes?tab=cartoes" className="font-medium text-brand-1 underline-offset-4 hover:underline">Configurações</Link> para acompanhar o uso.
                        </p>
                    )}
                </SectionCard>
            </div>
        </div>
    )
}

export default function CardInvoicePageWrapper() {
    return (
        <React.Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <CardInvoicePage />
        </React.Suspense>
    )
}
