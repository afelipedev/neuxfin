import { describe, expect, it } from 'vitest'
import { formatBalanceMessage, parseCommand, parseUpdate, splitMessage, type TelegramUpdate } from './parse'

const msg = (m: Partial<NonNullable<TelegramUpdate['message']>>): TelegramUpdate => ({
    update_id: 1,
    message: { message_id: 1, chat: { id: 42, type: 'private' }, from: { id: 7, username: 'ana' }, ...m },
})

describe('parseCommand', () => {
    it('extrai comando e argumento, inclusive com @bot', () => {
        expect(parseCommand('/start ABC123')).toEqual({ command: 'start', arg: 'ABC123' })
        expect(parseCommand('/Saldo@NeuxFinBot')).toEqual({ command: 'saldo', arg: '' })
        expect(parseCommand('gastei 10')).toBeNull()
    })
})

describe('parseUpdate', () => {
    it('texto comum vira mensagem para o agente', () => {
        expect(parseUpdate(msg({ text: '  gastei 35 no almoço ' }))).toEqual({ kind: 'text', chatId: 42, text: 'gastei 35 no almoço' })
    })

    it('comando traz o username', () => {
        expect(parseUpdate(msg({ text: '/start XYZ' }))).toEqual({ kind: 'command', chatId: 42, command: 'start', arg: 'XYZ', username: 'ana' })
    })

    it('ignora grupos, bots e updates sem mensagem', () => {
        expect(parseUpdate(msg({ text: 'oi', chat: { id: 1, type: 'group' } }))).toEqual({ kind: 'ignore' })
        expect(parseUpdate(msg({ text: 'oi', from: { id: 9, is_bot: true } }))).toEqual({ kind: 'ignore' })
        expect(parseUpdate({ update_id: 2 })).toEqual({ kind: 'ignore' })
    })

    it('áudio de voz até 2 minutos; acima disso é recusado', () => {
        expect(parseUpdate(msg({ voice: { file_id: 'f1', duration: 30 } }))).toEqual({ kind: 'voice', chatId: 42, fileId: 'f1', duration: 30 })
        expect(parseUpdate(msg({ voice: { file_id: 'f2', duration: 121 } }))).toEqual({ kind: 'too_long', chatId: 42, what: 'audio' })
    })

    it('texto longo demais e tipos não suportados', () => {
        expect(parseUpdate(msg({ text: 'x'.repeat(2001) }))).toEqual({ kind: 'too_long', chatId: 42, what: 'texto' })
        expect(parseUpdate(msg({}))).toEqual({ kind: 'unsupported', chatId: 42 })
    })
})

describe('mensagens', () => {
    it('resumo do /saldo', () => {
        const text = formatBalanceMessage({
            saldo_disponivel: 1500,
            saldo_previsto_fim_do_mes: 1300,
            faturas_cartao_a_pagar: 0,
            contas: [{ nome: 'Nubank', saldo: 1500 }],
            mes: { receitas: 500, despesas: 200, resultado: 300 },
        }).replace(/ /g, ' ')
        expect(text).toContain('Saldo disponível: R$ 1.500,00')
        expect(text).toContain('• Nubank: R$ 1.500,00')
        expect(text).toContain('Previsto para o fim do mês: R$ 1.300,00')
        expect(text).not.toContain('Faturas')
    })

    it('divide mensagens longas em quebras de linha', () => {
        const parts = splitMessage(Array.from({ length: 10 }, (_, i) => `linha ${i}`).join('\n'), 30)
        expect(parts.every(p => p.length <= 30)).toBe(true)
        expect(parts.join('\n')).toBe(Array.from({ length: 10 }, (_, i) => `linha ${i}`).join('\n'))
    })
})
