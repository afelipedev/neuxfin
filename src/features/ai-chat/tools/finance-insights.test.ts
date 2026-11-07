import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

import { groupByCategory, nextSubscriptionCharge } from './finance-insights'

describe('nextSubscriptionCharge', () => {
    it('mensal: próxima no mês atual ou no seguinte', () => {
        const sub = { frequencia: 'mensal' as const, data_vencimento_dia: 10, data_inicio: '2026-01-01' }
        expect(nextSubscriptionCharge(sub, '2026-11-07')).toBe('2026-11-10')
        expect(nextSubscriptionCharge(sub, '2026-11-11')).toBe('2026-12-10')
    })

    it('sem próxima cobrança depois do encerramento', () => {
        const sub = { frequencia: 'mensal' as const, data_vencimento_dia: 10, data_inicio: '2026-01-01', data_fim: '2026-11-30' }
        expect(nextSubscriptionCharge(sub, '2026-11-11')).toBeNull()
    })

    it('anual: só no mês de aniversário', () => {
        const sub = { frequencia: 'anual' as const, data_vencimento_dia: 15, data_inicio: '2026-03-01' }
        expect(nextSubscriptionCharge(sub, '2026-11-07')).toBe('2027-03-15')
    })
})

describe('groupByCategory', () => {
    it('soma em centavos, ordena e calcula percentual', () => {
        const r = groupByCategory([
            { valor: 0.1, categoria: { nome: 'Lazer' } },
            { valor: '0.2', categoria: { nome: 'Lazer' } },
            { valor: 0.7, categoria: { nome: 'Mercado' } },
            { valor: 1, categoria: null },
        ])
        expect(r.total).toBe(2)
        expect(r.categorias).toEqual([
            { categoria: 'Sem categoria', valor: 1, lancamentos: 1, percentual: 50 },
            { categoria: 'Mercado', valor: 0.7, lancamentos: 1, percentual: 35 },
            { categoria: 'Lazer', valor: 0.3, lancamentos: 2, percentual: 15 },
        ])
    })
})
