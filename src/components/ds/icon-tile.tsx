import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TONE, type Tone } from "./tone"

const SIZE = {
    sm: "h-8 w-8 rounded-lg [&_svg]:size-4",
    md: "h-10 w-10 rounded-xl [&_svg]:size-5",
    lg: "h-12 w-12 rounded-xl [&_svg]:size-6",
} as const

interface IconTileProps {
    icon: LucideIcon
    tone?: Tone
    size?: keyof typeof SIZE
    /** Cor livre definida pelo usuário (conta, cofrinho). Substitui o tom. */
    color?: string | null
    className?: string
}

/** Ícone dentro de um bloco com fundo suave na cor do tom. */
export function IconTile({ icon: Icon, tone = "brand", size = "md", color, className }: IconTileProps) {
    return (
        <span
            aria-hidden="true"
            className={cn("inline-flex shrink-0 items-center justify-center", SIZE[size], !color && TONE[tone].soft, className)}
            style={color ? { backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`, color } : undefined}
        >
            <Icon />
        </span>
    )
}
