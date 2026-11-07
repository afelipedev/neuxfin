import { describe, expect, it } from 'vitest'
import { buildInstallments } from './installments'

const base = {
    descricao: 'TV',
    valor: 1000,
    data_vencimento: '2027-01-31',
    status: 'liquidado' as const,
    data_pagamento: '2027-01-31',
}

describe('buildInstallments', () => {
    const parcelas = buildInstallments(base, 3, 'pai-1')

    it('divide em centavos e o resto fica na 1ª parcela', () => {
        expect(parcelas.map(p => p.valor)).toEqual([333.34, 333.33, 333.33])
    })

    it('mesmo dia nos meses seguintes, limitado ao fim do mês', () => {
        expect(parcelas.map(p => p.data_vencimento)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31'])
    })

    it('liga as parcelas à 1ª e numera a descrição', () => {
        expect(parcelas[0]).toMatchObject({ id: 'pai-1', transacao_pai_id: null, descricao: 'TV (1/3)' })
        expect(parcelas.slice(1).every(p => p.transacao_pai_id === 'pai-1' && !('id' in p))).toBe(true)
        expect(parcelas[2].descricao).toBe('TV (3/3)')
    })

    it('só a 1ª herda o pagamento', () => {
        expect(parcelas.map(p => [p.status, p.data_pagamento])).toEqual([
            ['liquidado', '2027-01-31'],
            ['pendente', null],
            ['pendente', null],
        ])
    })

    it('valida a quantidade e o valor mínimo', () => {
        expect(() => buildInstallments(base, 1, 'x')).toThrow('de 2 a 48')
        expect(() => buildInstallments(base, 49, 'x')).toThrow('de 2 a 48')
        expect(() => buildInstallments({ ...base, valor: 0.01 }, 2, 'x')).toThrow('pequeno demais')
    })
})
