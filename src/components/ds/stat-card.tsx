import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CountUp } from "./count-up"
import { IconTile } from "./icon-tile"
import { TONE, type Tone } from "./tone"

interface StatCardProps {
    label: string
    /** Valor já formatado (texto livre, datas, percentuais) */
    value?: React.ReactNode
    /** Valor monetário: exibido com animação de contagem */
    amount?: number
    hint?: React.ReactNode
    icon?: LucideIcon
    tone?: Tone
    loading?: boolean
    /** Torna o card inteiro um link (ex.: KPI do dashboard → página da lista) */
    href?: string
    /** Valor menor, para datas ou textos curtos */
    size?: "md" | "sm"
    className?: string
}

/** KPI padrão: rótulo, valor em destaque, dica e ícone opcional. */
export function StatCard({ label, value, amount, hint, icon, tone = "neutral", loading, href, size = "md", className }: StatCardProps) {
    const body = (
        <CardContent className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
                <p className="eyebrow">{label}</p>
                {loading ? (
                    <Skeleton className="h-8 w-32" />
                ) : (
                    <div
                        className={cn(
                            "font-display font-bold leading-tight tracking-tight tabular-nums",
                            size === "md" ? "text-2xl sm:text-[1.75rem]" : "text-lg",
                            TONE[tone].text
                        )}
                    >
                        {amount !== undefined ? <CountUp value={amount} /> : value}
                    </div>
                )}
                {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
            </div>
            {icon && <IconTile icon={icon} tone={tone} />}
        </CardContent>
    )

    const cardClass = cn("gap-0 py-5", className)

    if (href) {
        return (
            <Link href={href} className="group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2">
                <Card className={cn(cardClass, "lift h-full group-hover:border-brand-1/40")}>{body}</Card>
            </Link>
        )
    }
    return <Card className={cardClass}>{body}</Card>
}

/**
 * Grade responsiva de KPIs por container query: responde à largura do espaço
 * disponível (não da tela), então funciona em colunas laterais e em páginas cheias.
 * 1 coluna < 384px · 2 colunas · 3 (≥ 672px) · 4 (≥ 896px)
 */
export function StatGrid({ children, columns = 4, className }: { children: React.ReactNode; columns?: 2 | 3 | 4; className?: string }) {
    return (
        <div className="@container">
            <div
                className={cn(
                    "stagger grid grid-cols-1 gap-4 @sm:grid-cols-2",
                    columns === 3 && "@2xl:grid-cols-3",
                    columns === 4 && "@4xl:grid-cols-4",
                    className
                )}
            >
                {children}
            </div>
        </div>
    )
}
