import { describe, expect, it } from 'vitest'
import { buildReport, reportRange, type ReportTx } from './reports'

const t = (p: Partial<ReportTx>): ReportTx => ({
    valor: 0,
    tipo_transacao: 'despesa',
    tipo: 'PF',
    data_vencimento: '2026-10-10',
    is_recorrente: false,
    total_parcelas: null,
    categoria: null,
    ...p,
})

describe('reportRange', () => {
    it('cobre os últimos N meses terminando no mês atual', () => {
        expect(reportRange(3, '2026-11-05')).toEqual({ from: '2026-09-01', to: '2026-11-30', keys: ['2026-09', '2026-10', '2026-11'] })
    })

    it('atravessa a virada do ano', () => {
        expect(reportRange(3, '2027-01-15').keys).toEqual(['2026-11', '2026-12', '2027-01'])
    })
})

describe('buildReport', () => {
    const { keys } = reportRange(3, '2026-11-05')
    const report = buildReport({
        keys,
        saldoDisponivel: 1000,
        cofrinhos: [
            { nome: 'Viagem', objetivo: 4000, saldo_atual: 1000, data_prevista: null },
            { nome: 'Sem meta', objetivo: null, saldo_atual: 0, data_prevista: null },
        ],
        txs: [
            t({ valor: 3000, tipo_transacao: 'receita', data_vencimento: '2026-10-05', categoria: { nome: 'Salário', cor: null } }),
            t({ valor: 1000, data_vencimento: '2026-10-10', is_recorrente: true, categoria: { nome: 'Moradia', cor: '#f00' } }),
            t({ valor: 500, tipo: 'PJ', data_vencimento: '2026-11-10', categoria: { nome: 'Moradia', cor: '#f00' } }),
            t({ valor: 99, data_vencimento: '2026-12-01' }), // fora do período
        ],
    })

    it('totaliza receitas, despesas e resultado do período', () => {
        expect([report.receitas, report.despesas, report.resultado]).toEqual([3000, 1500, 1500])
    })

    it('calcula taxa de poupança e comprometimento com despesas fixas', () => {
        expect(report.taxa_poupanca).toBe(50)
        expect(report.comprometimento).toBe(33.3)
    })

    it('média mensal ignora meses sem despesa e autonomia usa saldo + cofrinhos', () => {
        expect(report.despesa_media_mensal).toBe(750)
        expect(report.autonomia_meses).toBe(2.7)
    })

    it('agrupa categorias com variação do último mês vs o anterior', () => {
        expect(report.categorias.map(c => [c.name, c.value, c.variacao])).toEqual([['Moradia', 1500, -50]])
    })

    it('separa PF e PJ por mês', () => {
        expect(report.months[2].pj.despesas).toBe(500)
        expect(report.months[1].pf.receitas).toBe(3000)
    })

    it('metas de cofrinho só com objetivo definido', () => {
        expect(report.cofrinhos).toHaveLength(1)
        expect(report.cofrinhos[0].progresso).toBe(25)
    })

    it('sem receitas, indicadores ficam nulos em vez de dividir por zero', () => {
        const empty = buildReport({ keys, txs: [], saldoDisponivel: 0, cofrinhos: [] })
        expect([empty.taxa_poupanca, empty.comprometimento, empty.autonomia_meses]).toEqual([null, null, null])
    })
})
