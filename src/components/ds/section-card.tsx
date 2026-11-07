import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SectionCardProps {
    title?: React.ReactNode
    description?: React.ReactNode
    /** Ações no canto do cabeçalho */
    actions?: React.ReactNode
    children: React.ReactNode
    /** Conteúdo encostado nas bordas (tabelas, listas) */
    flush?: boolean
    className?: string
    contentClassName?: string
}

/** Bloco de conteúdo padrão (tabelas, gráficos, listas) com cabeçalho consistente. */
export function SectionCard({ title, description, actions, children, flush, className, contentClassName }: SectionCardProps) {
    return (
        <Card className={cn("gap-4 overflow-hidden py-5", className)}>
            {(title || actions) && (
                <CardHeader className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6">
                    <div className="min-w-0 space-y-1">
                        {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
                        {description && <CardDescription className="text-xs">{description}</CardDescription>}
                    </div>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </CardHeader>
            )}
            <CardContent className={cn(flush ? "px-0" : "px-4 sm:px-6", contentClassName)}>{children}</CardContent>
        </Card>
    )
}
