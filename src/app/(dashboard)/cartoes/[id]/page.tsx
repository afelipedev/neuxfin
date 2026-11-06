"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    shiftInvoiceKey,
    type Invoice,
} from "@/features/credit-cards/services/invoices"
import { InvoiceStatusBadge } from "@/features/credit-cards/components/invoice-status-badge"
import { PayInvoiceDialog } from "@/features/credit-cards/components/pay-invoice-dialog"
import { ReverseInvoiceButton } from "@/features/credit-cards/components/reverse-invoice-button"
import { todayISO } from "@/features/bank-accounts/services/balances"

const formatDay = (iso: string) => format(parseLocalDate(iso), "dd/MM/yyyy")
const KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Card className="border-none glass-card">
            <CardContent className="p-5 space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
                <div className="text-xl font-black tracking-tighter font-display tabular-nums">{children}</div>
            </CardContent>
        </Card>
    )
}

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
            <div className="max-w-3xl mx-auto py-16 text-center space-y-4">
                <p className="text-muted-foreground">Cartão não encontrado.</p>
                <Button asChild variant="outline"><Link href="/cartoes">Voltar aos cartões</Link></Button>
            </div>
        )
    }

    const limite = Number(card?.limite || 0)
    const uso = card && limite > 0 ? Math.min(100, Math.round((card.usado / limite) * 100)) : 0
    const competenciaLabel = key ? format(parseLocalDate(`${key}-01`), "MMMM yyyy", { locale: ptBR }) : ""
    const pagoComRestante = invoice?.pagamento && invoice.em_aberto > 0

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <Button asChild variant="ghost" size="icon" className="shrink-0" aria-label="Voltar aos cartões">
                        <Link href="/cartoes"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div
                        className="h-12 w-16 rounded-xl shrink-0 flex items-end justify-end p-1.5 text-[8px] font-black text-white/70"
                        style={{ backgroundColor: card?.cor || "#6366f1" }}
                    >
                        {card?.bandeira || "CARD"}
                    </div>
                    <div className="min-w-0">
                        {loading && !card ? (
                            <Skeleton className="h-8 w-48 rounded-lg" />
                        ) : (
                            <h1 className="text-3xl font-black tracking-tighter font-display truncate">{card?.nome}</h1>
                        )}
                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">
                            Fecha dia {card?.dia_fechamento} · Vence dia {card?.dia_vencimento}
                        </p>
                    </div>
                </div>

                <div className="flex items-center bg-secondary/30 dark:bg-zinc-100/5 rounded-xl border border-border px-2 w-full sm:w-auto justify-between">
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => key && setSelectedKey(shiftInvoiceKey(key, -1))} aria-label="Fatura anterior" disabled={!key}>
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-[10px] uppercase font-black tracking-widest px-2 min-w-[140px] text-center">
                        Fatura {competenciaLabel}
                    </span>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => key && setSelectedKey(shiftInvoiceKey(key, 1))} aria-label="Próxima fatura" disabled={!key}>
                        <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            {invoice && (
                <>
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <Stat label="Total da fatura">{formatCurrency(invoice.total)}</Stat>
                        <Stat label="Em aberto">
                            <span className={invoice.em_aberto > 0 ? "text-amber-500" : "text-brand-1"}>{formatCurrency(invoice.em_aberto)}</span>
                        </Stat>
                        <Stat label="Fechamento"><span className="text-base">{formatDay(invoice.fechamento)}</span></Stat>
                        <Stat label="Vencimento"><span className="text-base">{formatDay(invoice.vencimento)}</span></Stat>
                    </div>

                    <Card className="border-none glass-card">
                        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">Situação</span>
                                    <InvoiceStatusBadge status={invoice.status} />
                                </div>
                                {invoice.pagamento ? (
                                    <p className="text-xs text-muted-foreground">
                                        Paga em {formatDay(invoice.pagamento.data_pagamento)} com {invoice.pagamento.conta?.nome ?? "conta"} · {formatCurrency(Number(invoice.pagamento.valor))}
                                    </p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {invoice.status === "aberta" || invoice.status === "futura"
                                            ? "Fatura ainda aberta: novas compras até o fechamento entram nela."
                                            : invoice.em_aberto > 0 ? "Fatura fechada aguardando pagamento." : "Sem valores a pagar."}
                                    </p>
                                )}
                                {pagoComRestante && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        Há {formatCurrency(invoice.em_aberto)} em compras lançadas depois do pagamento. Estorne e pague novamente para incluí-las.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
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
                <Card className="border-none glass-card shadow-none overflow-hidden rounded-3xl lg:col-span-2">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Compras da fatura</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0 pt-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest px-6">Data</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest">Descrição</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest hidden md:table-cell">Categoria</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-6">Valor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-10 text-[10px] uppercase font-black tracking-widest opacity-50 italic">Carregando...</TableCell>
                                        </TableRow>
                                    ) : compras.totalCount === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-10 text-sm text-muted-foreground">
                                                Nenhuma compra nesta fatura. Lance despesas escolhendo &quot;Cartão de crédito&quot; como forma de pagamento.
                                            </TableCell>
                                        </TableRow>
                                    ) : compras.pageItems.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="px-6 text-xs text-muted-foreground whitespace-nowrap">{formatDay(c.data_vencimento)}</TableCell>
                                            <TableCell className="font-semibold">
                                                {c.descricao}
                                                {c.status === "liquidado" && (
                                                    <span className="ml-2 text-[10px] font-black uppercase text-brand-1">Paga</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{c.categoria?.nome ?? "-"}</TableCell>
                                            <TableCell className="text-right px-6 font-black tabular-nums">{formatCurrency(Number(c.valor))}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <DataTablePagination
                            page={compras.page}
                            pageSize={compras.pageSize}
                            totalCount={compras.totalCount}
                            onPageChange={compras.setPage}
                            onPageSizeChange={compras.setPageSize}
                        />
                    </CardContent>
                </Card>

                <Card className="border-none glass-card h-fit">
                    <CardHeader className="p-6 pb-2">
                        <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Limite</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-2 space-y-4">
                        {limite > 0 && card ? (
                            <>
                                <Progress
                                    value={uso}
                                    aria-label={`Limite usado: ${uso}%`}
                                    className="bg-secondary"
                                    indicatorClassName={uso >= 80 ? "bg-rose-500" : "bg-brand-1"}
                                />
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Limite total</dt><dd className="font-bold tabular-nums">{formatCurrency(limite)}</dd></div>
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Usado ({uso}%)</dt><dd className="font-bold tabular-nums">{formatCurrency(card.usado)}</dd></div>
                                    <div className="flex justify-between"><dt className="text-muted-foreground">Disponível</dt><dd className={cn("font-bold tabular-nums", card.disponivel < 0 ? "text-rose-500" : "text-brand-1")}>{formatCurrency(card.disponivel)}</dd></div>
                                </dl>
                                <p className="text-[11px] text-muted-foreground">O limite usado inclui parcelas futuras ainda não pagas.</p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">Informe o limite do cartão em Configurações para acompanhar o uso.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function CardInvoicePageWrapper() {
    return (
        <React.Suspense fallback={<Skeleton className="h-64 max-w-[1200px] mx-auto rounded-3xl" />}>
            <CardInvoicePage />
        </React.Suspense>
    )
}
