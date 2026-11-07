"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, formatDateToISO, parseLocalDate } from "@/lib/utils"

interface DatePickerProps extends Omit<React.ComponentProps<typeof Button>, "value" | "onChange"> {
    /** Data no formato do banco: "YYYY-MM-DD" ("" ou null = vazio) */
    value: string | null | undefined
    onChange: (iso: string) => void
    placeholder?: string
    /** Mostra botão para limpar (campos opcionais) */
    clearable?: boolean
    /** Limites de seleção (inclusive), "YYYY-MM-DD" */
    min?: string
    max?: string
}

const YEARS_BACK = 10
const YEARS_AHEAD = 30

/**
 * Seletor de data padrão do NeuxFin: botão com a data por extenso ("6 de novembro de 2026")
 * que abre o calendário. Trabalha com strings ISO locais (`parseLocalDate`/`formatDateToISO`),
 * então não sofre o deslocamento de fuso do `new Date(str)`.
 * Aceita as props do FormControl (id, aria-*) quando usado em formulários.
 */
export function DatePicker({
    value,
    onChange,
    placeholder = "Selecione uma data",
    clearable,
    min,
    max,
    className,
    disabled,
    ...triggerProps
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const selected = value ? parseLocalDate(value) : undefined
    const minDate = min ? parseLocalDate(min) : undefined
    const maxDate = max ? parseLocalDate(max) : undefined
    const thisYear = new Date().getFullYear()

    return (
        <div className="relative">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start pl-3 text-left font-normal",
                            !selected && "text-muted-foreground",
                            clearable && selected && "pr-10",
                            className
                        )}
                        {...triggerProps}
                    >
                        <span className="truncate">{selected ? format(selected, "PPP", { locale: ptBR }) : placeholder}</span>
                        {!(clearable && selected) && <CalendarIcon className="ml-auto h-4 w-4 opacity-50" aria-hidden="true" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        required
                        selected={selected}
                        defaultMonth={selected ?? minDate}
                        onSelect={(date) => {
                            // Clicar no dia já selecionado não apaga a data
                            if (date) onChange(formatDateToISO(date))
                            setOpen(false)
                        }}
                        disabled={[
                            ...(minDate ? [{ before: minDate }] : []),
                            ...(maxDate ? [{ after: maxDate }] : []),
                        ]}
                        captionLayout="dropdown"
                        startMonth={new Date(thisYear - YEARS_BACK, 0)}
                        endMonth={new Date(thisYear + YEARS_AHEAD, 11)}
                        autoFocus
                        locale={ptBR}
                    />
                </PopoverContent>
            </Popover>
            {clearable && selected && !disabled && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Limpar data"
                    onClick={() => onChange("")}
                    className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                >
                    <X />
                </Button>
            )}
        </div>
    )
}
