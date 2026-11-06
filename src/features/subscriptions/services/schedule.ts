import { dateInMonthClamped, formatDateToISO, parseLocalDate } from '@/lib/utils'
import { fromCents, toCents } from '@/features/bank-accounts/services/balances'

export type SubscriptionFrequency = 'mensal' | 'anual' | 'semanal' | 'trimestral'

export interface ScheduleInput {
    frequencia: SubscriptionFrequency | null
    /** Dia de cobrança (1-31). Sem valor, usa o dia de data_inicio. */
    data_vencimento_dia: number | null
    /** Primeira cobrança possível (YYYY-MM-DD); define o mês de anual/trimestral e o dia da semana de semanal. */
    data_inicio: string
}

const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())

/**
 * Datas de cobrança da assinatura dentro do mês (`month` 1-12), nunca antes de data_inicio.
 * - mensal: todo mês, no dia de vencimento (limitado ao último dia do mês)
 * - trimestral: a cada 3 meses a partir do mês de início
 * - anual: no mês de início, todo ano
 * - semanal: a cada 7 dias a partir de data_inicio
 */
export function subscriptionOccurrences(sub: ScheduleInput, year: number, month: number): string[] {
    const inicio = parseLocalDate(sub.data_inicio)
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)
    if (monthEnd < inicio) return []

    const frequencia = sub.frequencia ?? 'mensal'

    if (frequencia === 'semanal') {
        const dates: string[] = []
        // Primeiro múltiplo de 7 dias a partir do início que caia no mês
        const diffDays = Math.max(0, Math.ceil((monthStart.getTime() - inicio.getTime()) / 86_400_000))
        const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + Math.ceil(diffDays / 7) * 7)
        while (d <= monthEnd) {
            if (d >= monthStart) dates.push(formatDateToISO(d))
            d.setDate(d.getDate() + 7)
        }
        return dates
    }

    const diff = monthsBetween(inicio, monthStart)
    if (frequencia === 'trimestral' && diff % 3 !== 0) return []
    if (frequencia === 'anual' && diff % 12 !== 0) return []

    const dia = sub.data_vencimento_dia ?? inicio.getDate()
    const date = dateInMonthClamped(year, month - 1, dia)
    return date < inicio ? [] : [formatDateToISO(date)]
}

/** Custo mensal equivalente (semanal = 52 semanas ÷ 12 meses). */
export function monthlyCost(valor: number | string, frequencia: SubscriptionFrequency | null): number {
    const cents = toCents(valor)
    switch (frequencia) {
        case 'anual': return fromCents(Math.round(cents / 12))
        case 'trimestral': return fromCents(Math.round(cents / 3))
        case 'semanal': return fromCents(Math.round((cents * 52) / 12))
        default: return fromCents(cents)
    }
}
