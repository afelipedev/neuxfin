import { describe, expect, it } from 'vitest'
import { DEFAULT_CDI_ANUAL, normalizeCdi, projectSavings } from './projection'

describe('projectSavings', () => {
    it('12 meses rendem exatamente a taxa anual', () => {
        expect(projectSavings(10000, 13.15)).toEqual({ projetado: 11315, rendimento: 1315, taxa_mensal: 1.03 })
    })

    it('usa a taxa configurada, não um valor fixo', () => {
        expect(projectSavings(10000, 10).projetado).toBe(11000)
        expect(projectSavings(10000, 0).projetado).toBe(10000)
    })

    it('juros compostos em períodos menores que um ano', () => {
        // (1,1)^(6/12) = 1,0488...
        expect(projectSavings(1000, 10, 6).projetado).toBe(1048.81)
    })

    it('arredonda em centavos', () => {
        expect(projectSavings(0.1, 13.15).projetado).toBe(0.11)
    })
})

describe('normalizeCdi', () => {
    it('aceita NUMERIC como string e zero', () => {
        expect(normalizeCdi('10.5')).toBe(10.5)
        expect(normalizeCdi(0)).toBe(0)
    })

    it('valores ausentes ou absurdos caem no padrão', () => {
        expect(normalizeCdi(null)).toBe(DEFAULT_CDI_ANUAL)
        expect(normalizeCdi('abc')).toBe(DEFAULT_CDI_ANUAL)
        expect(normalizeCdi(-1)).toBe(DEFAULT_CDI_ANUAL)
        expect(normalizeCdi(500)).toBe(DEFAULT_CDI_ANUAL)
    })
})
