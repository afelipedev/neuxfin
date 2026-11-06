import { describe, expect, it } from 'vitest'
import { monthlyCost, subscriptionOccurrences, type ScheduleInput } from './schedule'

const sub = (p: Partial<ScheduleInput>): ScheduleInput => ({
    frequencia: 'mensal',
    data_vencimento_dia: 10,
    data_inicio: '2026-01-05',
    ...p,
})

describe('subscriptionOccurrences', () => {
    it('mensal cobra uma vez por mês no dia de vencimento', () => {
        expect(subscriptionOccurrences(sub({}), 2026, 11)).toEqual(['2026-11-10'])
    })

    it('dia 31 é limitado ao último dia do mês (não pula para o mês seguinte)', () => {
        expect(subscriptionOccurrences(sub({ data_vencimento_dia: 31 }), 2027, 2)).toEqual(['2027-02-28'])
        expect(subscriptionOccurrences(sub({ data_vencimento_dia: 31 }), 2028, 2)).toEqual(['2028-02-29'])
        expect(subscriptionOccurrences(sub({ data_vencimento_dia: 31 }), 2026, 4)).toEqual(['2026-04-30'])
    })

    it('não cobra antes da data de início', () => {
        // Início em 15/01 com vencimento dia 10: primeira cobrança em fevereiro
        expect(subscriptionOccurrences(sub({ data_inicio: '2026-01-15' }), 2026, 1)).toEqual([])
        expect(subscriptionOccurrences(sub({ data_inicio: '2026-01-15' }), 2026, 2)).toEqual(['2026-02-10'])
        expect(subscriptionOccurrences(sub({ data_inicio: '2026-03-01' }), 2026, 2)).toEqual([])
    })

    it('sem dia de vencimento usa o dia da data de início', () => {
        expect(subscriptionOccurrences(sub({ data_vencimento_dia: null, data_inicio: '2026-01-20' }), 2026, 3)).toEqual(['2026-03-20'])
    })

    it('anual cobra só no mês de início, todo ano', () => {
        const anual = sub({ frequencia: 'anual', data_inicio: '2026-03-01', data_vencimento_dia: 15 })
        expect(subscriptionOccurrences(anual, 2026, 3)).toEqual(['2026-03-15'])
        expect(subscriptionOccurrences(anual, 2026, 4)).toEqual([])
        expect(subscriptionOccurrences(anual, 2027, 2)).toEqual([])
        expect(subscriptionOccurrences(anual, 2027, 3)).toEqual(['2027-03-15'])
    })

    it('trimestral cobra a cada 3 meses a partir do início, atravessando o ano', () => {
        const tri = sub({ frequencia: 'trimestral', data_inicio: '2026-11-01', data_vencimento_dia: 5 })
        expect(subscriptionOccurrences(tri, 2026, 11)).toEqual(['2026-11-05'])
        expect(subscriptionOccurrences(tri, 2026, 12)).toEqual([])
        expect(subscriptionOccurrences(tri, 2027, 1)).toEqual([])
        expect(subscriptionOccurrences(tri, 2027, 2)).toEqual(['2027-02-05'])
    })

    it('semanal cobra a cada 7 dias a partir do início', () => {
        // 2026-11-02 é segunda-feira
        const semanal = sub({ frequencia: 'semanal', data_inicio: '2026-11-02' })
        expect(subscriptionOccurrences(semanal, 2026, 11)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
        expect(subscriptionOccurrences(semanal, 2026, 12)).toEqual(['2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28'])
        expect(subscriptionOccurrences(semanal, 2026, 10)).toEqual([])
    })

    it('frequência ausente é tratada como mensal', () => {
        expect(subscriptionOccurrences(sub({ frequencia: null }), 2026, 11)).toEqual(['2026-11-10'])
    })
})

describe('monthlyCost', () => {
    it('converte cada frequência para o custo mensal', () => {
        expect(monthlyCost(50, 'mensal')).toBe(50)
        expect(monthlyCost(120, 'anual')).toBe(10)
        expect(monthlyCost(90, 'trimestral')).toBe(30)
        expect(monthlyCost(30, 'semanal')).toBe(130) // 30 × 52 ÷ 12
        expect(monthlyCost('19.90', null)).toBe(19.9)
    })
})
