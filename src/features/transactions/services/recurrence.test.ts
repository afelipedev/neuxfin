import { describe, expect, it } from 'vitest'
import { buildRecurringSeries, MAX_RECURRENCE_MONTHS } from './recurrence'

const base = {
    descricao: 'Salário',
    valor: 5000,
    data_vencimento: '2026-11-05',
    data_pagamento: '2026-11-05',
    status: 'liquidado' as const,
}

describe('buildRecurringSeries', () => {
    it('cria um lançamento por mês com o mesmo dia', () => {
        const serie = buildRecurringSeries(base, 3, 'rec-1')
        expect(serie.map(t => t.data_vencimento)).toEqual(['2026-11-05', '2026-12-05', '2027-01-05'])
        expect(serie.every(t => t.recorrencia_id === 'rec-1' && t.is_recorrente)).toBe(true)
        expect(serie.every(t => t.descricao === 'Salário' && t.valor === 5000)).toBe(true)
    })

    it('só o primeiro herda o status pago; os futuros ficam pendentes', () => {
        const serie = buildRecurringSeries(base, 3, 'rec-1')
        expect(serie.map(t => [t.status, t.data_pagamento])).toEqual([
            ['liquidado', '2026-11-05'],
            ['pendente', null],
            ['pendente', null],
        ])
    })

    it('dia 31 é limitado ao fim de cada mês sem perder o dia original', () => {
        const serie = buildRecurringSeries({ ...base, data_vencimento: '2027-01-31' }, 4, 'rec-2')
        expect(serie.map(t => t.data_vencimento)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30'])
    })

    it('não é parcela', () => {
        const [t] = buildRecurringSeries(base, 1, 'rec-3')
        expect([t.parcela_atual, t.total_parcelas]).toEqual([null, null])
    })

    it('limita a quantidade de meses', () => {
        expect(buildRecurringSeries(base, 0, 'x')).toHaveLength(1)
        expect(buildRecurringSeries(base, 500, 'x')).toHaveLength(MAX_RECURRENCE_MONTHS)
    })
})
