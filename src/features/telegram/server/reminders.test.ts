import { describe, expect, it } from 'vitest'
import { buildReminders, formatReminderMessage, weekStart, type ReminderInput } from './reminders'

const today = '2026-11-09' // segunda-feira

const input: ReminderInput = {
    today,
    openTxs: [
        { id: 'a', descricao: 'FIES', valor: 520, tipo_transacao: 'despesa', data_vencimento: '2026-11-05' },
        { id: 'v1', descricao: 'Antiga 1', valor: 100, tipo_transacao: 'despesa', data_vencimento: '2026-10-01' },
        { id: 'v2', descricao: 'Antiga 2', valor: '50.5', tipo_transacao: 'despesa', data_vencimento: '2026-03-01' },
        { id: 'b', descricao: 'Luz', valor: '180.5', tipo_transacao: 'despesa', data_vencimento: '2026-11-09' },
        { id: 'c', descricao: 'Internet', valor: 100, tipo_transacao: 'despesa', data_vencimento: '2026-11-10' },
        { id: 'd', descricao: 'Aluguel', valor: 1500, tipo_transacao: 'despesa', data_vencimento: '2026-11-20' },
        { id: 'e', descricao: 'Freela', valor: 800, tipo_transacao: 'receita', data_vencimento: '2026-11-09' },
        { id: 'f', descricao: 'Reembolso atrasado', valor: 50, tipo_transacao: 'receita', data_vencimento: '2026-11-01' },
    ],
    invoices: [
        { cartao_id: 'c1', cartao: 'Nubank', key: '2026-11', vencimento: '2026-11-12', em_aberto: 450 },
        { cartao_id: 'c1', cartao: 'Nubank', key: '2026-12', vencimento: '2026-12-12', em_aberto: 90 },
        { cartao_id: 'c2', cartao: 'Itaú', key: '2026-11', vencimento: '2026-11-10', em_aberto: 0 },
    ],
    budgets: [
        { id: 'o1', categoria: 'Lazer', percentual: 120, gasto: 360, limite: 300, status: 'estourado' },
        { id: 'o2', categoria: 'Mercado', percentual: 85, gasto: 850, limite: 1000, status: 'atencao' },
        { id: 'o3', categoria: 'Saúde', percentual: 10, gasto: 10, limite: 100, status: 'ok' },
    ],
    subscriptions: [
        { id: 's1', nome: 'Netflix', valor: 55.9, cobranca: '2026-11-10', onde: 'cartão Nubank' },
        { id: 's2', nome: 'Spotify', valor: 21.9, cobranca: '2026-11-15', onde: 'conta Itaú' },
    ],
    weekly: { despesas: 700, receitas: 1000, top_categorias: [{ categoria: 'Mercado', valor: 400 }], saldo_disponivel: 5000, saldo_previsto_fim_do_mes: 3200 },
}

describe('buildReminders', () => {
    const items = buildReminders(input)
    const keys = items.map(i => i.key)

    it('contas atrasadas, de hoje e de amanhã (não as distantes)', () => {
        expect(keys).toContain('atraso:a')
        expect(keys).toContain('hoje:b:2026-11-09')
        expect(keys).toContain('amanha:c:2026-11-10')
        expect(keys.some(k => k.includes(':d'))).toBe(false)
    })

    it('atrasos antigos viram uma linha semanal, sem listar item a item', () => {
        expect(keys).toContain('atrasos-antigos:2026-11-09')
        expect(keys.some(k => k.includes(':v1') || k.includes(':v2'))).toBe(false)
        const linha = items.find(i => i.key.startsWith('atrasos-antigos'))!.text.replace(/\u00a0/g, ' ')
        expect(linha).toContain('2 contas em atraso há mais de 7 dias, total R$ 150,50')
    })

    it('receita só no dia', () => {
        expect(keys).toContain('receber:e:2026-11-09')
        expect(keys.some(k => k.includes(':f'))).toBe(false)
    })

    it('faturas em aberto que vencem em até 3 dias', () => {
        expect(keys.filter(k => k.startsWith('fatura:'))).toEqual(['fatura:c1:2026-11:avencer'])
    })

    it('assinatura cobrada amanhã', () => {
        expect(keys.filter(k => k.startsWith('assinatura:'))).toEqual(['assinatura:s1:2026-11-10'])
    })

    it('orçamentos em atenção ou estourados, uma vez por mês e por nível', () => {
        expect(keys.filter(k => k.startsWith('orcamento:'))).toEqual(['orcamento:o1:2026-11:estourado', 'orcamento:o2:2026-11:atencao'])
    })

    it('resumo semanal com chave da semana', () => {
        expect(keys).toContain('resumo:2026-11-09')
    })

    it('mensagem agrupa por seção, na ordem de urgência', () => {
        const msg = formatReminderMessage(items).replace(/ /g, ' ')
        expect(msg.indexOf('Em atraso')).toBeLessThan(msg.indexOf('Vencem hoje'))
        expect(msg.indexOf('Vencem hoje')).toBeLessThan(msg.indexOf('Faturas'))
        expect(msg).toContain('• FIES: R$ 520,00 (venceu 05/11)')
        expect(msg).toContain('• Nubank: R$ 450,00 (vence 12/11)')
        expect(formatReminderMessage([])).toBe('')
    })
})

describe('weekStart', () => {
    it('segunda-feira da semana', () => {
        expect(weekStart('2026-11-09')).toBe('2026-11-09')
        expect(weekStart('2026-11-15')).toBe('2026-11-09') // domingo
        expect(weekStart('2026-11-11')).toBe('2026-11-09')
    })
})
