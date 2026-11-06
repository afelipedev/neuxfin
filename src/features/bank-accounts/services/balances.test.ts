import { describe, expect, it } from 'vitest'
import {
    buildStatement,
    cofrinhoToMovements,
    computeAccountBalance,
    computeAccountBalances,
    computeProjectedBalance,
    deriveStatus,
    effectiveDate,
    fromCents,
    invoicePaymentsToMovements,
    sumBalances,
    toCents,
    transfersToMovements,
    type BalanceTx,
} from './balances'

const TODAY = '2026-11-05'

const tx = (p: Partial<BalanceTx> = {}): BalanceTx => ({
    conta_id: 'A',
    tipo_transacao: 'despesa',
    valor: 0,
    status: 'pendente',
    data_vencimento: '2026-11-10',
    data_pagamento: null,
    ...p,
})

describe('centavos', () => {
    it('soma sem erro de ponto flutuante', () => {
        expect(fromCents(toCents(0.1) + toCents(0.2))).toBe(0.3)
    })

    it('aceita NUMERIC vindo como string e trata nulos como zero', () => {
        expect(toCents('1234.56')).toBe(123456)
        expect(toCents(null)).toBe(0)
        expect(toCents(undefined)).toBe(0)
    })
})

describe('effectiveDate', () => {
    it('usa data_pagamento e cai para data_vencimento quando vazia', () => {
        expect(effectiveDate({ data_pagamento: '2026-11-02', data_vencimento: '2026-11-10' })).toBe('2026-11-02')
        expect(effectiveDate({ data_pagamento: null, data_vencimento: '2026-11-10' })).toBe('2026-11-10')
    })
})

describe('deriveStatus', () => {
    it('pendente vencido vira atrasado', () => {
        expect(deriveStatus(tx({ data_vencimento: '2026-11-01' }), TODAY)).toBe('atrasado')
    })

    it('vencendo hoje ainda é pendente', () => {
        expect(deriveStatus(tx({ data_vencimento: TODAY }), TODAY)).toBe('pendente')
    })

    it('liquidado nunca atrasa', () => {
        expect(deriveStatus(tx({ status: 'liquidado', data_vencimento: '2026-01-01', data_pagamento: '2026-01-01' }), TODAY)).toBe('liquidado')
    })

    it('compra no cartão não atrasa sozinha (quem vence é a fatura)', () => {
        expect(deriveStatus({ status: 'pendente', data_vencimento: '2026-01-01', cartao_id: 'c1' }, TODAY)).toBe('pendente')
    })
})

describe('saldo da conta', () => {
    const txs = [
        tx({ tipo_transacao: 'receita', valor: '500', status: 'liquidado', data_pagamento: '2026-11-01' }),
        tx({ valor: 200, status: 'pendente', data_vencimento: '2026-11-20' }),
        tx({ valor: 0.1, status: 'liquidado', data_pagamento: '2026-11-02' }),
        tx({ valor: 0.2, status: 'liquidado', data_pagamento: '2026-11-02' }),
        tx({ valor: 999, status: 'liquidado', data_pagamento: '2026-12-25' }), // pagamento futuro
        tx({ conta_id: null, valor: 50, status: 'liquidado', data_pagamento: '2026-11-03' }), // sem conta
    ]

    it('considera só liquidados até a data, ignorando pendentes e pagamentos futuros', () => {
        expect(computeAccountBalance(1000, txs.filter(t => t.conta_id === 'A'), TODAY)).toBe(1499.7)
    })

    it('transações sem conta não afetam nenhum saldo', () => {
        const accs = computeAccountBalances([{ id: 'A', saldo_inicial: '1000' }, { id: 'B', saldo_inicial: 10 }], txs, TODAY)
        expect(accs.map(a => a.saldo_atual)).toEqual([1499.7, 10])
        expect(sumBalances(accs)).toBe(1509.7)
    })

    it('saldo previsto subtrai despesas em aberto até o fim do mês', () => {
        const p = computeProjectedBalance(1509.7, txs, '2026-11-30')
        expect(p.saldo_previsto).toBe(1309.7)
        expect(p.despesas_a_pagar).toBe(200)
    })

    it('data_saldo_inicial ignora movimentos anteriores ao corte', () => {
        const all = [
            tx({ tipo_transacao: 'receita', valor: 1000, status: 'liquidado', data_pagamento: '2026-11-01' }),
            tx({ valor: 50, status: 'liquidado', data_vencimento: '2026-10-15', data_pagamento: '2026-10-15' }),
        ]
        const [a] = computeAccountBalances([{ id: 'A', saldo_inicial: 0, data_saldo_inicial: '2026-11-01' }], all, TODAY)
        expect(a.saldo_atual).toBe(1000)
    })
})

describe('extrato', () => {
    const txs = [
        tx({ tipo_transacao: 'receita', valor: 500, status: 'liquidado', data_pagamento: '2026-11-01' }),
        tx({ valor: 0.1, status: 'liquidado', data_pagamento: '2026-11-02' }),
        tx({ valor: 0.2, status: 'liquidado', data_pagamento: '2026-11-02' }),
    ]

    it('calcula saldo anterior, saídas e saldo corrido', () => {
        const st = buildStatement(1000, txs, '2026-11-02', '2026-11-30')
        expect(st.saldo_anterior).toBe(1500)
        expect(st.saidas).toBe(0.3)
        expect(st.saldo_final).toBe(1499.7)
        expect(st.rows.at(-1)?.saldo_apos).toBe(1499.7)
    })
})

describe('movimentos que não são receita/despesa', () => {
    const transfers = transfersToMovements([
        { id: 't1', conta_origem_id: 'A', conta_destino_id: 'B', valor: '300', data: '2026-11-02', descricao: null },
    ])
    const cofrinho = cofrinhoToMovements([
        { id: 'c1', tipo: 'aporte', valor: 100, data: '2026-11-03T15:00:00.000Z', conta_id: 'A', cofrinho: { nome: 'Viagem' } },
        { id: 'c2', tipo: 'resgate', valor: 40, data: '2026-11-04T15:00:00.000Z', conta_id: 'B', cofrinho: { nome: 'Viagem' } },
    ])
    const all = [
        tx({ tipo_transacao: 'receita', valor: 1000, status: 'liquidado', data_vencimento: '2026-11-01', data_pagamento: '2026-11-01' }),
        ...transfers,
        ...cofrinho,
    ]

    it('transferência move entre contas sem alterar o total; cofrinho tira e devolve', () => {
        const accs = computeAccountBalances([
            { id: 'A', saldo_inicial: 0 },
            { id: 'B', saldo_inicial: 0 },
        ], all, TODAY)
        expect(accs.map(a => a.saldo_atual)).toEqual([600, 340]) // A: 1000-300-100 | B: 300+40
        expect(sumBalances(accs)).toBe(940)
    })

    it('extrato da conta inclui transferência e aporte', () => {
        const st = buildStatement(0, all.filter(t => t.conta_id === 'A'), '2026-11-01', '2026-11-30')
        expect(st.rows).toHaveLength(3)
        expect(st.saidas).toBe(400)
        expect(st.saldo_final).toBe(600)
    })

    it('pagamento de fatura debita a conta na data do pagamento', () => {
        const movs = invoicePaymentsToMovements([
            { id: 'pay1', conta_id: 'acc', competencia: '2026-11-01', valor: 100.1, data_pagamento: '2026-11-09', cartao: { nome: 'Nubank' } },
        ])
        expect(movs[0].descricao).toBe('Pagamento da fatura Nubank (11/2026)')
        expect(computeAccountBalance(1000, movs, '2026-11-08')).toBe(1000)
        expect(computeAccountBalance(1000, movs, '2026-11-09')).toBe(899.9)
    })
})
