import { describe, expect, it } from 'vitest'
import { dateInMonthClamped, formatCurrency, formatDateToISO, getErrorCode, getErrorMessage, parseLocalDate, toError } from './utils'

describe('datas locais', () => {
    it('parseLocalDate não volta um dia por causa do fuso', () => {
        const d = parseLocalDate('2026-01-31')
        expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 31])
    })

    it('parseLocalDate ignora a parte de horário/UTC', () => {
        expect(formatDateToISO(parseLocalDate('2026-01-31T00:00:00.000Z'))).toBe('2026-01-31')
    })

    it('formatDateToISO usa a data local', () => {
        expect(formatDateToISO(new Date(2026, 0, 31, 23, 59))).toBe('2026-01-31')
    })

    it('dateInMonthClamped limita ao último dia do mês', () => {
        expect(formatDateToISO(dateInMonthClamped(2027, 1, 31))).toBe('2027-02-28')
        expect(formatDateToISO(dateInMonthClamped(2028, 1, 31))).toBe('2028-02-29')
        expect(formatDateToISO(dateInMonthClamped(2026, 10, 15))).toBe('2026-11-15')
    })
})

describe('formatCurrency', () => {
    // Intl usa espaço não separável entre "R$" e o número
    const normalize = (s: string) => s.replace(/ /g, ' ')

    it('formata em reais', () => {
        expect(normalize(formatCurrency(1234.56))).toBe('R$ 1.234,56')
        expect(normalize(formatCurrency(0))).toBe('R$ 0,00')
        expect(normalize(formatCurrency(-50))).toBe('-R$ 50,00')
    })

    it('aceita NUMERIC como string e trata vazio/ inválido como zero', () => {
        expect(normalize(formatCurrency('1500.5'))).toBe('R$ 1.500,50')
        expect(normalize(formatCurrency(null))).toBe('R$ 0,00')
        expect(normalize(formatCurrency('abc'))).toBe('R$ 0,00')
    })

    it('sem centavos para rótulos de gráfico', () => {
        expect(normalize(formatCurrency(1234.56, { fractionDigits: 0 }))).toBe('R$ 1.235')
    })
})

describe('erros desconhecidos', () => {
    const pgError = { message: 'Conta possui transações', code: '23503', details: null }

    it('extrai a mensagem de Error, PostgrestError e string', () => {
        expect(getErrorMessage(new Error('falhou'))).toBe('falhou')
        expect(getErrorMessage(pgError)).toBe('Conta possui transações')
        expect(getErrorMessage('texto')).toBe('texto')
        expect(getErrorMessage(undefined, 'padrão')).toBe('padrão')
    })

    it('lê o código do Postgres', () => {
        expect(getErrorCode(pgError)).toBe('23503')
        expect(getErrorCode(new Error('x'))).toBeUndefined()
    })

    it('normaliza para Error mantendo a instância original', () => {
        const original = new Error('x')
        expect(toError(original)).toBe(original)
        expect(toError(pgError)).toBeInstanceOf(Error)
        expect(toError(pgError).message).toBe('Conta possui transações')
    })
})
