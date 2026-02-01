import { openai } from '@ai-sdk/openai'
import { generateText, tool } from 'ai'
import { createClient } from '@supabase/supabase-js'
import {
    addTransactionCore,
    addTransactionSchema
} from '@/features/ai-chat/tools/finance-tools'

export async function POST(req: Request) {
    try {
        const { message, userId } = await req.json()

        if (!userId) {
            return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 })
        }

        // Initialize Supabase Admin Client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { text, toolCalls } = await generateText({
            model: openai('gpt-4o-mini'),
            system: `Você é uma automação financeira que processa mensagens de texto ou transcrições de áudio do WhatsApp.
            
            OBJETIVO:
            - Identificar se o usuário está relatando uma despesa ou receita.
            - Extrair valor, descrição e categoria.
            - Registrar no banco de dados.
            
            REGRAS:
            - Se a mensagem for clara sobre uma transação, chame a ferramenta 'add_transaction'.
            - Se a mensagem for vaga ou não for sobre finanças, responda explicando que não entendeu.
            - Tente inferir a categoria pelo contexto (ex: "McDonalds" -> Alimentação).
            `,
            prompt: message,
            tools: {
                add_transaction: tool({
                    description: 'Adiciona uma nova transação financeira baseada no relato do usuário.',
                    parameters: addTransactionSchema,
                    // @ts-ignore
                    execute: async (params: any) => {
                        return addTransactionCore(supabase, userId, params)
                    },
                }),
            },
        })

        return new Response(JSON.stringify({
            response: text,
            toolCalls: toolCalls,
            processed: toolCalls.length > 0
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
}
