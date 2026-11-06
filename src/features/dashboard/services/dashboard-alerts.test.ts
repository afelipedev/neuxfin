import { describe, expect, it } from 'vitest'
import { buildInvoices } from '@/features/credit-cards/services/invoices'
import { buildAlerts } from './dashboard-alerts'

const today = '2026-11-05'
const nubank = { id: 'c1', nome: 'Nubank', limite: 1000, dia_fechamento: 3, dia_vencimento: 10 }
const invoices = buildInvoices(nubank, [
    { id: 'b', cartao_id: 'c1', descricao: 'b', valor: 50.25, data_vencimento: '2026-11-01', status: 'pendente', fatura_pagamento_id: null },
], [], today)
const card = { ...nubank, usado: 850, disponivel: 150, invoices, fatura_atual: invoices[0], fatura_pendente: invoices[0] }

const base = {
    today,
    openTxs: [
        { id: 't1', descricao: 'Luz', valor: 200, data_vencimento: '2026-11-01', tipo_transacao: 'despesa' as const },
        { id: 't2', descricao: 'Aluguel', valor: 1500, data_vencimento: '2026-11-10', tipo_transacao: 'despesa' as const },
    ],
    cards: [card],
    cofrinhosTotal: 2000,
    mediaDespesasMensal: 1000,
    saldoPrevistoFimMes: -50,
}

describe('buildAlerts', () => {
    it('lista vencimentos (atrasados primeiro) e a fatura do cartão', () => {
        expect(buildAlerts(base).upcoming.map(u => u.id)).toEqual(['t1', 't2', 'fatura:c1:2026-11'])
    })

    it('ordena alertas por gravidade', () => {
        expect(buildAlerts(base).alerts.map(a => [a.id, a.level])).toEqual([
            ['atrasados', 'critico'],
            ['saldo-previsto-negativo', 'critico'],
            ['limite:c1', 'atencao'],
            ['reserva', 'atencao'],
        ])
    })

    it('reserva = cofrinhos ÷ despesa média mensal', () => {
        expect(buildAlerts(base).reserva_meses).toBe(2)
    })

    it('sem atrasos, saldo positivo e reserva de 6+ meses não gera alerta crítico', () => {
        const { alerts } = buildAlerts({
            ...base,
            openTxs: [],
            cards: [],
            cofrinhosTotal: 6000,
            saldoPrevistoFimMes: 100,
        })
        expect(alerts.some(a => a.level === 'critico')).toBe(false)
    })

    it('saldo previsto desconhecido (outro mês) não gera alerta de saldo', () => {
        const { alerts } = buildAlerts({ ...base, saldoPrevistoFimMes: undefined })
        expect(alerts.some(a => a.id === 'saldo-previsto-negativo')).toBe(false)
    })
})
