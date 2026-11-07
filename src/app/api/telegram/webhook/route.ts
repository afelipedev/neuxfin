import { createHash, timingSafeEqual } from 'node:crypto'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { handleUpdate } from '@/features/telegram/server/handle-update'
import type { TelegramUpdate } from '@/features/telegram/server/parse'

// O processamento (IA + transcrição) continua depois da resposta, em after()
export const maxDuration = 60

/**
 * Valida o header que o Telegram envia em todo update quando o webhook é registrado com
 * `secret_token`. Falha fechado: sem TELEGRAM_WEBHOOK_SECRET nenhuma requisição passa.
 */
function isAuthorized(req: Request): boolean {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (!secret) return false
    const received = req.headers.get('x-telegram-bot-api-secret-token')
    if (!received) return false
    const a = createHash('sha256').update(secret).digest()
    const b = createHash('sha256').update(received).digest()
    return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
    if (!isAuthorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let update: TelegramUpdate
    try {
        update = await req.json()
    } catch {
        return Response.json({ error: 'JSON inválido' }, { status: 400 })
    }
    if (!Number.isSafeInteger(update?.update_id)) return Response.json({ ok: true })

    // Idempotência: o Telegram reenvia o mesmo update se não receber 200 a tempo
    const admin = createAdminClient()
    const { error } = await admin.from('telegram_updates').insert({ update_id: update.update_id })
    if (error) {
        if (error.code === '23505') return Response.json({ ok: true, duplicate: true })
        console.error('[telegram] falha ao registrar update', error)
        // 500 faz o Telegram tentar de novo mais tarde
        return Response.json({ error: 'Falha ao registrar update' }, { status: 500 })
    }

    after(() => handleUpdate(update))
    return Response.json({ ok: true })
}
