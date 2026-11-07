import { describe, expect, it } from 'vitest'
import {
    buildInvoices,
    cardLimitUsage,
    invoiceDates,
    invoiceKeyForDate,
    keyToCompetencia,
    openInvoicesUntil,
    shiftInvoiceKey,
    type CardPurchase,
    type InvoicePayment,
} from './invoices'

// Fecha dia 3, vence dia 10 do mesmo mês
const nubank = { id: 'c1', nome: 'Nubank', limite: 1000, dia_fechamento: 3, dia_vencimento: 10 }
// Fecha dia 28, vence dia 5 do mês seguinte
const itau = { id: 'c2', nome: 'Itaú', limite: 0, dia_fechamento: 28, dia_vencimento: 5 }
// Fecha dia 31: em meses curtos, limitado ao último dia
const c31 = { id: 'c3', nome: 'X', limite: 0, dia_fechamento: 31, dia_vencimento: 8 }

describe('ciclo da fatura', () => {
    it('compra antes do fechamento entra na fatura do mês; no dia do fechamento, na próxima', () => {
        expect(invoiceKeyForDate('2026-11-02', nubank)).toBe('2026-11')
        expect(invoiceKeyForDate('2026-11-03', nubank)).toBe('2026-12')
    })

    it('vira o ano', () => {
        expect(invoiceKeyForDate('2026-12-20', nubank)).toBe('2027-01')
    })

    it('vence no mesmo mês quando dia_vencimento > dia_fechamento', () => {
        expect(invoiceDates('2026-12', nubank)).toEqual({ fechamento: '2026-12-03', vencimento: '2026-12-10' })
    })

    it('vence no mês seguinte ao fechamento quando dia_vencimento <= dia_fechamento', () => {
        expect(invoiceKeyForDate('2026-11-27', itau)).toBe('2026-12')
        expect(invoiceKeyForDate('2026-11-28', itau)).toBe('2027-01')
        expect(invoiceDates('2027-01', itau)).toEqual({ fechamento: '2026-12-28', vencimento: '2027-01-05' })
    })

    it('fechamento no dia 31 é limitado ao fim de fevereiro', () => {
        expect(invoiceKeyForDate('2027-02-27', c31)).toBe('2027-03')
        expect(invoiceKeyForDate('2027-02-28', c31)).toBe('2027-04')
        expect(invoiceDates('2027-03', c31)).toEqual({ fechamento: '2027-02-28', vencimento: '2027-03-08' })
    })

    it('navega entre competências', () => {
        expect(shiftInvoiceKey('2026-12', 1)).toBe('2027-01')
        expect(shiftInvoiceKey('2027-01', -1)).toBe('2026-12')
        expect(keyToCompetencia('2026-11')).toBe('2026-11-01')
    })
})

describe('status e totais da fatura', () => {
    const p = (id: string, data: string, valor: number, status: CardPurchase['status'] = 'pendente', pag: string | null = null): CardPurchase =>
        ({ id, cartao_id: 'c1', descricao: id, valor, data_vencimento: data, status, fatura_pagamento_id: pag })

    const purchases = [
        p('a', '2026-10-05', 100.1, 'liquidado', 'pay1'), // fatura nov: paga
        p('b', '2026-11-01', 50.25),                      // fatura nov: em aberto
        p('c', '2026-11-04', 30),                         // fatura dez: ciclo atual
        p('d', '2026-12-15', 20),                         // fatura jan: futura
    ]
    const payments: InvoicePayment[] = [
        { id: 'pay1', cartao_id: 'c1', competencia: '2026-11-01', conta_id: 'acc', valor: 100.1, data_pagamento: '2026-11-09', estornado_em: null },
    ]
    const today = '2026-11-05'
    const invoices = buildInvoices(nubank, purchases, payments, today)

    it('classifica fechada/aberta/futura e soma em aberto', () => {
        expect(invoices.map(i => [i.key, i.status, i.total, i.em_aberto])).toEqual([
            ['2026-11', 'fechada', 150.35, 50.25], // há compra em aberto apesar do pagamento
            ['2026-12', 'aberta', 30, 30],
            ['2027-01', 'futura', 20, 20],
        ])
    })

    it('depois do vencimento fica vencida', () => {
        expect(buildInvoices(nubank, purchases, payments, '2026-11-11')[0].status).toBe('vencida')
    })

    it('todas as compras pagas: paga', () => {
        expect(buildInvoices(nubank, [p('a', '2026-10-05', 100, 'liquidado', 'pay1')], payments, today)[0].status).toBe('paga')
    })

    it('pagamento estornado não gera fatura', () => {
        const estornado = [{ ...payments[0], estornado_em: '2026-11-10T00:00:00Z' }]
        expect(buildInvoices(nubank, [], estornado, today)).toHaveLength(0)
    })

    it('limite usado considera compras em aberto, inclusive parcelas futuras', () => {
        expect(cardLimitUsage(nubank, purchases)).toEqual({ usado: 100.25, disponivel: 899.75 })
    })

    it('faturas a pagar até uma data (saldo previsto)', () => {
        expect(openInvoicesUntil(invoices, '2026-11-30')).toBe(50.25)
        expect(openInvoicesUntil(invoices, '2026-12-31')).toBe(80.25)
    })
})

describe('pagamento parcial', () => {
    const p = (id: string, data: string, valor: number, status: CardPurchase['status'] = 'pendente', pag: string | null = null): CardPurchase =>
        ({ id, cartao_id: 'c1', descricao: id, valor, data_vencimento: data, status, fatura_pagamento_id: pag })
    // Fatura de nov (R$ 300) paga com R$ 100: R$ 200 vão para dezembro
    const parcial: InvoicePayment = {
        id: 'pay1', cartao_id: 'c1', competencia: '2026-11-01', conta_id: 'acc', valor: 100,
        saldo_restante: '200', data_pagamento: '2026-11-09', estornado_em: null,
    }
    const purchases = [
        p('a', '2026-10-10', 300, 'liquidado', 'pay1'), // fatura nov
        p('b', '2026-11-20', 50.5),                     // fatura dez
    ]
    const today = '2026-11-15'

    it('fatura paga com restante fica "parcial" e o restante entra na seguinte', () => {
        const invoices = buildInvoices(nubank, purchases, [parcial], today)
        expect(invoices.map(i => [i.key, i.status, i.total, i.saldo_anterior, i.em_aberto])).toEqual([
            ['2026-11', 'parcial', 300, 0, 0],
            ['2026-12', 'aberta', 250.5, 200, 250.5],
        ])
        expect(openInvoicesUntil(invoices, '2026-12-31')).toBe(250.5)
    })

    it('saldo restante cria a fatura seguinte mesmo sem compras', () => {
        const invoices = buildInvoices(nubank, [purchases[0]], [parcial], today)
        expect(invoices.map(i => [i.key, i.em_aberto])).toEqual([['2026-11', 0], ['2026-12', 200]])
    })

    it('quando a fatura seguinte é paga, o saldo anterior sai do em aberto e do limite', () => {
        const dez: InvoicePayment = {
            id: 'pay2', cartao_id: 'c1', competencia: '2026-12-01', conta_id: 'acc', valor: 250.5,
            saldo_restante: 0, data_pagamento: '2026-12-09', estornado_em: null,
        }
        const pagas = [purchases[0], { ...purchases[1], status: 'liquidado' as const, fatura_pagamento_id: 'pay2' }]
        const invoices = buildInvoices(nubank, pagas, [parcial, dez], '2026-12-15')
        expect(invoices.map(i => [i.key, i.status, i.em_aberto])).toEqual([['2026-11', 'parcial', 0], ['2026-12', 'paga', 0]])
        expect(cardLimitUsage(nubank, pagas, [parcial, dez])).toEqual({ usado: 0, disponivel: 1000 })
    })

    it('limite usado inclui o saldo carregado ainda não pago', () => {
        expect(cardLimitUsage(nubank, purchases, [parcial])).toEqual({ usado: 250.5, disponivel: 749.5 })
    })
})
