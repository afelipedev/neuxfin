import { cn } from "@/lib/utils"

/** Cor padrão de cartão sem cor definida (secundária da marca). */
export const DEFAULT_CARD_COLOR = "#6366f1"

const SIZE = {
    sm: "h-6 w-10 rounded [&>span]:hidden",
    md: "h-10 w-14 rounded-lg text-2xs",
    lg: "h-12 w-16 rounded-xl text-2xs",
} as const

/** Miniatura do cartão (cor escolhida pelo usuário + bandeira). */
export function CardThumb({ color, brand, size = "md", className }: { color?: string | null; brand?: string | null; size?: keyof typeof SIZE; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "relative flex shrink-0 items-end justify-end overflow-hidden p-1.5 font-semibold uppercase text-white/80 shadow-sm",
                "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/15 before:to-transparent",
                SIZE[size],
                className
            )}
            style={{ backgroundColor: color || DEFAULT_CARD_COLOR }}
        >
            <span className="relative">{brand || "Cartão"}</span>
        </span>
    )
}
