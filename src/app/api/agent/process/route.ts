import { createHash, timingSafeEqual } from 'node:crypto'
import { generateText, stepCountIs, tool } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { describeAIError, resolveModel } from '@/features/ai-models/server/resolve-model'
import {
    addTransactionCore,
    addTransactionSchema
} from '@/features/ai-chat/tools/finance-tools'

/**
 * Valida o segredo compartilhado com a automação externa (ex.: WhatsApp/n8n).
 * Espera o header `Authorization: Bearer <AGENT_API_SECRET>`.
 * Falha fechado: se a variável não estiver configurada, nenhuma requisição passa.
 */
function isAuthorized(req: Request): boolean {
    const secret = process.env.AGENT_API_SECRET
    if (!secret) return false

    const header = req.headers.get('authorization') ?? ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) return false

    // Compara hashes para ter comprimento fixo e evitar timing attacks
    const expected = createHash('sha256').update(secret).digest()
    const received = createHash('sha256').update(token).digest()
    return timingSafeEqual(expected, received)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
    if (!isAuthorized(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    try {
        const { message, userId } = await req.json()

        if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
            return new Response(JSON.stringify({ error: 'userId (uuid) is required' }), { status: 400 })
        }
        if (typeof message !== 'string' || !message.trim()) {
            return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 })
        }

        const supabase = createAdminClient()
        // Usa o modelo de chat configurado pelo próprio usuário
        const resolved = await resolveModel(userId, { usage: 'chat' })

        const { text, steps } = await generateText({
            model: resolved.model,
            providerOptions: resolved.providerOptions,
            system: `Você é uma automação financeira que processa mensagens de texto ou transcrições de áudio do WhatsApp.
            
            OBJETIVO:
            - Identificar se o usuário está relatando uma despesa ou receita.
            - Extrair valor, descrição e categoria.
            - Registrar no banco de dados.
            
            REGRAS:
            - Se a mensagem for clara sobre uma transação, chame a ferramenta 'add_transaction'.
            - Se a mensagem for vaga ou não for sobre finanças, responda explicando que não entendeu.
            - Tente inferir a categoria pelo contexto (ex: "McDonalds" -> Alimentação).
            - Use pago=true quando o dinheiro já saiu/entrou ("gastei", "paguei", "recebi").
            - Se o usuário citar a conta/banco (ex.: "no Nubank"), informe conta_nome.
            - Hoje é ${new Date().toLocaleDateString('pt-BR')}. Datas no formato YYYY-MM-DD.
            - Depois de registrar, confirme em uma frase curta (valor, descrição e conta).
            `,
            prompt: message,
            tools: {
                add_transaction: tool({
                    description: 'Adiciona uma nova transação financeira baseada no relato do usuário.',
                    inputSchema: addTransactionSchema,
                    execute: async (params) => addTransactionCore(supabase, userId, params),
                }),
            },
            // Permite que o modelo confirme o registro após a chamada da ferramenta
            stopWhen: stepCountIs(3),
        })

        // Com várias etapas, `toolCalls` traz só a última; junta as de todas as etapas
        const toolCalls = steps.flatMap(step => step.toolCalls)

        return new Response(JSON.stringify({
            response: text,
            toolCalls,
            processed: toolCalls.length > 0
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error: unknown) {
        console.error('[agent/process]', error)
        const { message, status } = describeAIError(error)
        return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
