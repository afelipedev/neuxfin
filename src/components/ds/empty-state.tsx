import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { IconTile } from "./icon-tile"
import type { Tone } from "./tone"

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    tone?: Tone
    className?: string
}

/** Estado vazio padrão: ícone, título, explicação e ação. */
export function EmptyState({ icon, title, description, action, tone = "neutral", className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
            {icon && <IconTile icon={icon} tone={tone} size="lg" />}
            <div className="space-y-1">
                <p className="font-semibold">{title}</p>
                {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
            </div>
            {action && <div className="pt-1">{action}</div>}
        </div>
    )
}
