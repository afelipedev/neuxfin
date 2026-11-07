"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MonthStepperProps {
    month: number // 1-12
    year: number
    onChange: (month: number, year: number) => void
    /** Texto antes do mês (ex.: "Fatura") */
    prefix?: string
    /** Rótulo customizado no lugar de "mês ano" */
    label?: string
    disabled?: boolean
    className?: string
}

/** Navegação entre meses (‹ novembro 2026 ›), com virada de ano. */
export function MonthStepper({ month, year, onChange, prefix, label, disabled, className }: MonthStepperProps) {
    const shift = (delta: number) => {
        const target = new Date(year, month - 1 + delta, 1)
        onChange(target.getMonth() + 1, target.getFullYear())
    }
    const text = label ?? format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: ptBR })

    return (
        <div
            role="group"
            aria-label="Período"
            className={cn("flex h-9 items-center justify-between rounded-md border bg-card px-0.5 shadow-xs pointer-coarse:h-11", className)}
        >
            <Button variant="ghost" size="icon-sm" onClick={() => shift(-1)} disabled={disabled} aria-label="Período anterior">
                <ChevronLeft />
            </Button>
            <span className="min-w-[9rem] px-2 text-center text-sm font-semibold capitalize tabular-nums" aria-live="polite">
                {prefix && <span className="font-normal text-muted-foreground normal-case">{prefix} </span>}
                {text}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={() => shift(1)} disabled={disabled} aria-label="Próximo período">
                <ChevronRight />
            </Button>
        </div>
    )
}
