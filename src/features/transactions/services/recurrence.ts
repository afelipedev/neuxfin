import { dateInMonthClamped, formatDateToISO, parseLocalDate } from '@/lib/utils'

export const MAX_RECURRENCE_MONTHS = 60

export interface RecurrenceBase {
    data_vencimento: string
    data_pagamento: string | null
    status: 'liquidado' | 'pendente' | 'atrasado'
}

/**
 * Série mensal de um lançamento recorrente (ex.: salário, aluguel), criada de uma vez.
 * - Mesmo dia nos meses seguintes, limitado ao último dia do mês (31 → 28/29/30).
 * - Só o 1º lançamento herda o status/pagamento escolhido; os futuros nascem pendentes.
 * - Todos compartilham `recorrencia_id` para editar/excluir "esta e as próximas".
 */
export function buildRecurringSeries<T extends RecurrenceBase>(base: T, meses: number, recorrenciaId: string) {
    const total = Math.min(Math.max(Math.trunc(meses), 1), MAX_RECURRENCE_MONTHS)
    const inicio = parseLocalDate(base.data_vencimento)

    return Array.from({ length: total }, (_, idx) => {
        const vencimento = dateInMonthClamped(inicio.getFullYear(), inicio.getMonth() + idx, inicio.getDate())
        const primeira = idx === 0
        return {
            ...base,
            data_vencimento: formatDateToISO(vencimento),
            status: primeira ? base.status : ('pendente' as const),
            data_pagamento: primeira ? base.data_pagamento : null,
            is_recorrente: true,
            recorrencia_id: recorrenciaId,
            parcela_atual: null,
            total_parcelas: null,
        }
    })
}
