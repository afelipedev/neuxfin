import { ServerConfigError } from '@/lib/supabase/admin'
import { splitMessage } from './parse'

const API = 'https://api.telegram.org'
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024

function token(): string {
    const value = process.env.TELEGRAM_BOT_TOKEN
    if (!value) throw new ServerConfigError('TELEGRAM_BOT_TOKEN')
    return value
}

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${API}/bot${token()}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const json = (await res.json().catch(() => null)) as { ok: boolean; result?: T; description?: string } | null
    if (!res.ok || !json?.ok) {
        // Não inclui a URL (ela contém o token)
        throw new Error(`Telegram ${method} falhou: ${json?.description ?? res.status}`)
    }
    return json.result as T
}

/** Envia texto simples (sem parse_mode, para não precisar escapar Markdown). */
export async function sendMessage(chatId: number, text: string) {
    for (const part of splitMessage(text)) {
        await call('sendMessage', { chat_id: chatId, text: part, link_preview_options: { is_disabled: true } })
    }
}

export async function sendTyping(chatId: number, action: 'typing' | 'record_voice' = 'typing') {
    await call('sendChatAction', { chat_id: chatId, action }).catch(() => undefined)
}

/** Baixa um arquivo enviado ao bot (ex.: áudio de voz). */
export async function downloadFile(fileId: string): Promise<Uint8Array> {
    const file = await call<{ file_path?: string; file_size?: number }>('getFile', { file_id: fileId })
    if (!file.file_path) throw new Error('Arquivo indisponível no Telegram')
    if (file.file_size && file.file_size > MAX_DOWNLOAD_BYTES) throw new Error('Arquivo grande demais')
    const res = await fetch(`${API}/file/bot${token()}/${file.file_path}`)
    if (!res.ok) throw new Error(`Falha ao baixar arquivo do Telegram (${res.status})`)
    return new Uint8Array(await res.arrayBuffer())
}
