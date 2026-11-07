"use client"

import * as React from "react"
import { formatCurrency } from "@/lib/utils"

const DURATION = 900

/** Ease-out exponencial: rápido no começo, assenta suave no valor final. */
const easeOut = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Valor monetário que "conta" até o número final ao aparecer ou mudar.
 * Respeita prefers-reduced-motion e sempre termina exatamente no valor real
 * (o texto acessível é o valor final desde o início).
 */
export function CountUp({ value, format = formatCurrency }: { value: number; format?: (n: number) => string }) {
    // Começa em 0: o card aparece já contando até o valor
    const [shown, setShown] = React.useState(0)
    const fromRef = React.useRef(0)

    React.useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const from = fromRef.current
        fromRef.current = value
        if (reduce || from === value) {
            setShown(value)
            return
        }
        let frame = 0
        const start = performance.now()
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION)
            setShown(from + (value - from) * easeOut(t))
            if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [value])

    return (
        <>
            <span aria-hidden="true">{format(shown)}</span>
            <span className="sr-only">{format(value)}</span>
        </>
    )
}
