import { cn, formatCurrency } from "@/lib/utils"
import { TONE, signTone } from "./tone"

interface AmountProps {
    value: number | string
    /**
     * receita → verde com "+", despesa → vermelho com "−",
     * auto → cor pelo sinal, neutral → sem cor.
     */
    kind?: "receita" | "despesa" | "auto" | "neutral"
    /** Mostra o sinal (+/−) */
    signed?: boolean
    className?: string
}

/** Valor monetário padronizado (cor semântica, sinal e números tabulares). */
export function Amount({ value, kind = "neutral", signed = kind === "receita" || kind === "despesa", className }: AmountProps) {
    const n = Number(value) || 0
    const tone =
        kind === "receita" ? "success"
            : kind === "despesa" ? "danger"
                : kind === "auto" ? signTone(n)
                    : "neutral"
    const negative = kind === "despesa" || (kind !== "receita" && n < 0)
    const sign = signed ? (negative ? "− " : "+ ") : ""
    const shown = signed ? Math.abs(n) : n

    return (
        <span className={cn("whitespace-nowrap font-semibold tabular-nums", TONE[tone].text, className)}>
            {sign}{formatCurrency(shown)}
        </span>
    )
}
