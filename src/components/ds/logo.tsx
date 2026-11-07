import { cn } from "@/lib/utils"

/**
 * Marca NeuxFin: monograma "N" cujo último traço sobe e vira uma seta de alta
 * (a inicial da marca + crescimento financeiro). O mesmo desenho gera o favicon
 * e os ícones do PWA (scripts/generate-icons.py).
 */
export function LogoMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-9 w-9 shrink-0", className)}>
            <rect width="32" height="32" rx="9" fill="var(--primary)" />
            <path d="M9.5 23V10.5L20.5 21.5V9" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16.6 12.6L20.5 8.7L24.4 12.6" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function Logo({ className, hideWordmark }: { className?: string; hideWordmark?: boolean }) {
    return (
        <span className={cn("inline-flex items-center gap-2.5", className)}>
            <LogoMark />
            {!hideWordmark && (
                <span className="font-display text-xl font-bold tracking-tight text-foreground">
                    Neux<span className="text-brand-1">Fin</span>
                </span>
            )}
        </span>
    )
}
