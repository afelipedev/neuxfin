import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDueReminders } from '@/features/telegram/server/send-reminders'

export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Chamada pelo pg_cron a cada hora (public.disparar_lembretes_telegram). O segredo vem do
 * Vault no header x-lembretes-secret e é conferido pelo próprio banco (falha fechado).
 * Corpo opcional (teste manual): { "hora": 8 } ou { "usuario_id": "<uuid>" }.
 */
export async function POST(req: Request) {
    const secret = req.headers.get('x-lembretes-secret')
    if (!secret) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: ok, error } = await admin.rpc('validar_segredo_lembretes', { p_segredo: secret })
    if (error || ok !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { hora?: unknown; usuario_id?: unknown }
    const hour = Number.isInteger(body.hora) && (body.hora as number) >= 0 && (body.hora as number) <= 23 ? (body.hora as number) : undefined
    const onlyUserId = typeof body.usuario_id === 'string' && UUID_RE.test(body.usuario_id) ? body.usuario_id : undefined

    after(async () => {
        try {
            const result = await sendDueReminders({ hour, onlyUserId })
            console.log('[lembretes]', JSON.stringify(result))
        } catch (e) {
            console.error('[lembretes] falha geral', e)
        }
    })
    return Response.json({ ok: true }, { status: 202 })
}
