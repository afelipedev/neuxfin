import { generateText } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { describeAIError, resolveModel } from '@/features/ai-models/server/resolve-model'

export const maxDuration = 30

const bodySchema = z.object({ id: z.uuid() })

/** Testa um modelo cadastrado do usuário logado com uma chamada mínima. */
export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return Response.json({ error: 'Modelo inválido' }, { status: 400 })

    try {
        const resolved = await resolveModel(user.id, { modelId: parsed.data.id })
        const started = Date.now()
        await generateText({
            model: resolved.model,
            providerOptions: resolved.providerOptions,
            prompt: 'Responda apenas: OK',
            maxOutputTokens: 300,
            maxRetries: 0,
        })
        return Response.json({ message: `Conexão OK (${resolved.modelId}, ${Date.now() - started} ms)` })
    } catch (error) {
        console.error('[api/ai-models/test]', error)
        const { message, status } = describeAIError(error)
        return Response.json({ error: message }, { status })
    }
}
