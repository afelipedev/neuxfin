import * as React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: React.ReactNode
    description?: React.ReactNode
    /** Botões/filtros à direita. No mobile ocupam a largura toda, abaixo do título. */
    actions?: React.ReactNode
    /** Link "voltar" (páginas de detalhe) */
    back?: { href: string; label: string }
    /** Elemento antes do título (ícone da conta, miniatura do cartão) */
    leading?: React.ReactNode
    className?: string
}

/** Cabeçalho padrão de página: título, descrição e ações responsivas. */
export function PageHeader({ title, description, actions, back, leading, className }: PageHeaderProps) {
    return (
        <header className={cn("flex flex-col gap-4 md:flex-row md:items-center md:justify-between", className)}>
            <div className="flex min-w-0 items-center gap-3">
                {back && (
                    <Button asChild variant="ghost" size="icon" className="-ml-2 shrink-0">
                        <Link href={back.href} aria-label={back.label}>
                            <ArrowLeft />
                        </Link>
                    </Button>
                )}
                {leading}
                <div className="min-w-0 space-y-1">
                    <h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
            </div>
            {actions && (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end [&>*]:w-full sm:[&>*]:w-auto">
                    {actions}
                </div>
            )}
        </header>
    )
}
