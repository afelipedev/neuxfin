"use client"

import Link from "next/link"
import { format } from "date-fns"
import { CreditCard, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, parseLocalDate } from "@/lib/utils"
import { useCardsOverview } from "@/features/credit-cards/hooks/use-cards-overview"
import type { Invoice } from "@/features/credit-cards/services/invoices"
import { InvoiceStatusBadge } from "@/features/credit-cards/components/invoice-status-badge"

function InvoiceLine({ label, invoice }: { label: string; invoice: Invoice }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">
                    Vence {format(parseLocalDate(invoice.vencimento), "dd/MM")}
                </p>
            </div>
            <div className="text-right">
                <p className="font-black tabular-nums">{formatCurrency(invoice.status === "paga" ? invoice.total : invoice.em_aberto)}</p>
                <InvoiceStatusBadge status={invoice.status} />
            </div>
        </div>
    )
}

export default function CartoesPage() {
    const { cards, loading, error } = useCardsOverview()

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tighter font-display">Cartões</h1>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-black">Faturas, limites e pagamentos</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/configuracoes"><Plus className="mr-2 h-4 w-4" /> Gerenciar cartões</Link>
                </Button>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
                </div>
            ) : cards.length === 0 ? (
                <Card className="border-none glass-card">
                    <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                        <p className="font-bold">Nenhum cartão cadastrado</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Cadastre seus cartões em Configurações para acompanhar faturas e limite.
                        </p>
                        <Button asChild className="mt-2"><Link href="/configuracoes">Cadastrar cartão</Link></Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {cards.map(card => {
                        const limite = Number(card.limite || 0)
                        const uso = limite > 0 ? Math.min(100, Math.round((card.usado / limite) * 100)) : 0
                        return (
                            <Link key={card.id} href={`/cartoes/${card.id}`} className="group">
                                <Card className="border-none glass-card h-full transition-all group-hover:shadow-xl group-hover:-translate-y-0.5">
                                    <CardContent className="p-6 space-y-5">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="h-10 w-14 rounded-lg flex items-end justify-end p-1.5 text-[8px] font-black text-white/70 shrink-0"
                                                style={{ backgroundColor: card.cor || "#6366f1" }}
                                            >
                                                {card.bandeira || "CARD"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black truncate group-hover:text-brand-1 transition-colors">{card.nome}</p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Fecha dia {card.dia_fechamento} · Vence dia {card.dia_vencimento}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {card.fatura_pendente && <InvoiceLine label="A pagar" invoice={card.fatura_pendente} />}
                                            {card.fatura_atual && card.fatura_atual.key !== card.fatura_pendente?.key && (
                                                <InvoiceLine label="Fatura atual" invoice={card.fatura_atual} />
                                            )}
                                            {!card.fatura_pendente && !card.fatura_atual && (
                                                <p className="text-xs text-muted-foreground">Sem compras na fatura atual.</p>
                                            )}
                                        </div>

                                        {limite > 0 && (
                                            <div className="space-y-1.5">
                                                <Progress
                                                    value={uso}
                                                    aria-label={`Limite usado: ${uso}%`}
                                                    className="bg-secondary"
                                                    indicatorClassName={uso >= 80 ? "bg-rose-500" : "bg-brand-1"}
                                                />
                                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                                    <span>Usado {formatCurrency(card.usado)}</span>
                                                    <span>Disponível {formatCurrency(card.disponivel)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
