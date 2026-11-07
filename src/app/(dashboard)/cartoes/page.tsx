"use client"

import Link from "next/link"
import { format } from "date-fns"
import { CreditCard, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, PageHeader } from "@/components/ds"
import { formatCurrency, parseLocalDate } from "@/lib/utils"
import { useCardsOverview } from "@/features/credit-cards/hooks/use-cards-overview"
import type { Invoice } from "@/features/credit-cards/services/invoices"
import { InvoiceStatusBadge } from "@/features/credit-cards/components/invoice-status-badge"
import { CardThumb } from "@/features/credit-cards/components/card-thumb"

function InvoiceLine({ label, invoice }: { label: string; invoice: Invoice }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="eyebrow">{label}</p>
                <p className="text-xs text-muted-foreground">Vence {format(parseLocalDate(invoice.vencimento), "dd/MM")}</p>
            </div>
            <div className="space-y-1 text-right">
                <p className="font-semibold tabular-nums">{formatCurrency(invoice.status === "paga" ? invoice.total : invoice.em_aberto)}</p>
                <InvoiceStatusBadge status={invoice.status} />
            </div>
        </div>
    )
}

export default function CartoesPage() {
    const { cards, loading, error } = useCardsOverview()

    return (
        <div className="space-y-6 sm:space-y-8">
            <PageHeader
                title="Cartões"
                description="Faturas, limites e pagamentos"
                actions={
                    <Button asChild variant="outline">
                        <Link href="/configuracoes?tab=cartoes"><Settings2 /> Gerenciar cartões</Link>
                    </Button>
                }
            />

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-60 rounded-xl" />)}
                </div>
            ) : cards.length === 0 ? (
                <Card className="border-dashed">
                    <EmptyState
                        icon={CreditCard}
                        tone="secondary"
                        title="Nenhum cartão cadastrado"
                        description="Cadastre seus cartões para acompanhar faturas e limite."
                        action={<Button asChild><Link href="/configuracoes?tab=cartoes">Cadastrar cartão</Link></Button>}
                    />
                </Card>
            ) : (
                <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {cards.map(card => {
                        const limite = Number(card.limite || 0)
                        const uso = limite > 0 ? Math.min(100, Math.round((card.usado / limite) * 100)) : 0
                        return (
                            <Link key={card.id} href={`/cartoes/${card.id}`} className="group rounded-xl">
                                <Card className="lift h-full gap-5 group-hover:border-brand-1/40">
                                    <CardContent className="space-y-5">
                                        <div className="flex items-center gap-3">
                                            <CardThumb color={card.cor} brand={card.bandeira} />
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold transition-colors group-hover:text-brand-1">{card.nome}</p>
                                                <p className="text-xs text-muted-foreground">
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
                                                <p className="text-sm text-muted-foreground">Sem compras na fatura atual.</p>
                                            )}
                                        </div>

                                        {limite > 0 && (
                                            <div className="space-y-1.5">
                                                <Progress
                                                    value={uso}
                                                    aria-label={`Limite usado: ${uso}%`}
                                                    className="bg-muted"
                                                    indicatorClassName={uso >= 80 ? "bg-destructive" : "bg-primary"}
                                                />
                                                <div className="flex justify-between text-xs text-muted-foreground">
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
