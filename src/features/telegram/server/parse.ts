import { formatCurrency } from '@/lib/utils'

/** Subconjunto do Update da Bot API que o NeuxFin usa. */
export interface TelegramUpdate {
    update_id: number
    message?: {
        message_id: number
        chat: { id: number; type: 'private' | 'group' | 'supergroup' | 'channel' }
        from?: { id: number; username?: string; first_name?: string; is_bot?: boolean }
        text?: string
        voice?: { file_id: string; duration: number; file_size?: number }
        audio?: { file_id: string; duration: number; file_size?: number }
    }
}

export const MAX_TEXT_LENGTH = 2000
export const MAX_AUDIO_SECONDS = 120

export type ParsedUpdate =
    | { kind: 'ignore' }
    | { kind: 'command'; chatId: number; command: string; arg: string; username: string | null }
    | { kind: 'text'; chatId: number; text: string }
    | { kind: 'voice'; chatId: number; fileId: string; duration: number }
    | { kind: 'unsupported'; chatId: number }
    | { kind: 'too_long'; chatId: number; what: 'texto' | 'audio' }

/** "/start@NeuxFinBot ABC123" → { command: 'start', arg: 'ABC123' } */
export function parseCommand(text: string): { command: string; arg: string } | null {
    const match = text.trim().match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i)
    if (!match) return null
    return { command: match[1].toLowerCase(), arg: (match[2] ?? '').trim() }
}

/** Classifica o update. Só conversas privadas com pessoas são atendidas. */
export function parseUpdate(update: TelegramUpdate): ParsedUpdate {
    const msg = update.message
    if (!msg || msg.chat.type !== 'private' || msg.from?.is_bot) return { kind: 'ignore' }
    const chatId = msg.chat.id

    if (msg.text !== undefined) {
        const cmd = parseCommand(msg.text)
        if (cmd) return { kind: 'command', chatId, ...cmd, username: msg.from?.username ?? null }
        const text = msg.text.trim()
        if (!text) return { kind: 'ignore' }
        if (text.length > MAX_TEXT_LENGTH) return { kind: 'too_long', chatId, what: 'texto' }
        return { kind: 'text', chatId, text }
    }

    const audio = msg.voice ?? msg.audio
    if (audio) {
        if (audio.duration > MAX_AUDIO_SECONDS) return { kind: 'too_long', chatId, what: 'audio' }
        return { kind: 'voice', chatId, fileId: audio.file_id, duration: audio.duration }
    }

    return { kind: 'unsupported', chatId }
}

export interface BalanceSummary {
    saldo_disponivel: number
    saldo_previsto_fim_do_mes: number
    faturas_cartao_a_pagar: number
    contas: Array<{ nome: string; saldo: number }>
    mes: { receitas: number; despesas: number; resultado: number }
}

/** Resposta do /saldo, sem passar pela IA (rápida e determinística). */
export function formatBalanceMessage(b: BalanceSummary): string {
    const linhas = [
        `💰 Saldo disponível: ${formatCurrency(b.saldo_disponivel)}`,
        '',
        ...b.contas.map(c => `• ${c.nome}: ${formatCurrency(c.saldo)}`),
        '',
        'Este mês:',
        `• Receitas: ${formatCurrency(b.mes.receitas)}`,
        `• Despesas: ${formatCurrency(b.mes.despesas)}`,
        `• Resultado: ${formatCurrency(b.mes.resultado)}`,
    ]
    if (b.faturas_cartao_a_pagar > 0) linhas.push(`• Faturas a pagar: ${formatCurrency(b.faturas_cartao_a_pagar)}`)
    linhas.push('', `📅 Previsto para o fim do mês: ${formatCurrency(b.saldo_previsto_fim_do_mes)}`)
    return linhas.join('\n')
}

/** Divide textos maiores que o limite do Telegram (4096) em quebras de linha. */
export function splitMessage(text: string, max = 4000): string[] {
    if (text.length <= max) return [text]
    const parts: string[] = []
    let rest = text
    while (rest.length > max) {
        const cut = rest.lastIndexOf('\n', max)
        const at = cut > max / 2 ? cut : max
        parts.push(rest.slice(0, at))
        rest = rest.slice(at).replace(/^\n/, '')
    }
    if (rest) parts.push(rest)
    return parts
}

export const HELP_MESSAGE = [
    'Sou o Amigão, seu assistente financeiro do NeuxFin. 🤝',
    '',
    'Me mande em texto ou áudio, por exemplo:',
    '• "gastei 35 no almoço"',
    '• "recebi 2500 de salário no Nubank"',
    '• "conta de luz de 180 vence dia 15"',
    '• "quanto gastei essa semana?"',
    '',
    'Comandos:',
    '/saldo — saldo das contas e do mês',
    '/ajuda — esta mensagem',
    '/desvincular — desconecta este Telegram da sua conta',
].join('\n')

export const NOT_LINKED_MESSAGE = [
    'Este Telegram ainda não está vinculado a uma conta do NeuxFin.',
    '',
    'No app, abra Configurações → Telegram e toque em "Vincular Telegram". O link abre esta conversa já com o código.',
].join('\n')
