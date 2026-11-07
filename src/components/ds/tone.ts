/**
 * Tons do design system. Cada tom mapeia para classes literais (o Tailwind
 * precisa enxergar as strings completas). Use sempre estes mapas em vez de
 * cores do Tailwind (emerald-500, rose-500...) nos componentes.
 */
export type Tone =
    | "brand"      // primária (Teal Neux)
    | "secondary"  // secundária (Indigo)
    | "tertiary"   // terciária (Laranja)
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral"

interface ToneClasses {
    /** Texto/ícone na cor do tom */
    text: string
    /** Fundo suave + texto (badges, ícones em bloco) */
    soft: string
    /** Preenchimento sólido + texto contrastante */
    solid: string
    /** Borda suave (caixas de alerta) */
    border: string
}

export const TONE: Record<Tone, ToneClasses> = {
    brand: {
        text: "text-brand-1",
        soft: "bg-brand-1/10 text-brand-1",
        solid: "bg-brand-1 text-brand-1-foreground",
        border: "border-brand-1/20",
    },
    secondary: {
        text: "text-brand-2",
        soft: "bg-brand-2/10 text-brand-2",
        solid: "bg-brand-2 text-brand-2-foreground",
        border: "border-brand-2/20",
    },
    tertiary: {
        text: "text-brand-3",
        soft: "bg-brand-3/10 text-brand-3",
        solid: "bg-brand-3 text-brand-3-foreground",
        border: "border-brand-3/20",
    },
    success: {
        text: "text-success",
        soft: "bg-success/10 text-success",
        solid: "bg-success text-success-foreground",
        border: "border-success/20",
    },
    warning: {
        text: "text-warning",
        soft: "bg-warning/10 text-warning",
        solid: "bg-warning text-warning-foreground",
        border: "border-warning/20",
    },
    danger: {
        text: "text-destructive",
        soft: "bg-destructive/10 text-destructive",
        solid: "bg-destructive text-destructive-foreground",
        border: "border-destructive/20",
    },
    info: {
        text: "text-info",
        soft: "bg-info/10 text-info",
        solid: "bg-info text-info-foreground",
        border: "border-info/20",
    },
    neutral: {
        text: "text-foreground",
        soft: "bg-muted text-muted-foreground",
        solid: "bg-foreground text-background",
        border: "border-border",
    },
}

/** Tom de um valor monetário: positivo = success, negativo = danger. */
export function signTone(value: number, zero: Tone = "neutral"): Tone {
    if (value > 0) return "success"
    if (value < 0) return "danger"
    return zero
}
