import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { describeAIError, resolveModel, type ResolvedModel } from '@/features/ai-models/server/resolve-model'
import { buildFinanceTools, FINANCE_TOOLS_GUIDE } from '@/features/ai-chat/tools/finance-toolset'

export const maxDuration = 30

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

    const { messages }: { messages: UIMessage[] } = await req.json()

    let resolved: ResolvedModel
    try {
        resolved = await resolveModel(user.id, { usage: 'chat' })
    } catch (error) {
        console.error('[api/chat]', error)
        const { message, status } = describeAIError(error)
        return Response.json({ error: message }, { status })
    }

    const result = streamText({
        // Sem isso o modelo para após a chamada da ferramenta, sem responder em texto
        stopWhen: stepCountIs(6),
        model: resolved.model,
        providerOptions: resolved.providerOptions,
        system: `Você é o "NeuxFin Agent", também conhecido como "Amigão".
        
        PERSONALIDADE:
        - Você é descontraído, levemente sarcástico, mas muito útil.
        - Você fala gírias leves (tipo "beleza", "bora", "só dale", "vacilo").
        - Você é focado em ajudar o usuário a economizar, mas sem ser chato.
        - Se o usuário estiver gastando muito, dê uma bronca de leve (sarcasmo amigável).
        - Se o usuário estiver indo bem, elogie com entusiasmo.
        
        ${FINANCE_TOOLS_GUIDE}

        Hoje é ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Datas nas ferramentas em YYYY-MM-DD.
        
        FORMATAÇÃO (a resposta é renderizada em Markdown num balão estreito de chat):
        - Comece com uma frase curta que responda direto à pergunta.
        - Separe blocos com uma linha em branco. Cada item de lista fica em sua própria linha, iniciando com "- ".
        - Use listas para 3 ou mais números; no formato "- Rótulo: **R$ 1.234,56**".
        - Negrito só nos valores e no número principal da resposta (não em palavras soltas).
        - Valores sempre como R$ 1.234,56. Datas como 10/11/2026.
        - Não use títulos (#), tabelas nem blocos de código.
        - No máximo ~8 linhas. Termine com no máximo uma frase de dica ou pergunta.

        EXEMPLO DE RESPOSTA SOBRE SALDO:
        Seu saldo disponível hoje é **R$ 2.250,00**.

        Resumo de novembro:
        - Receitas: **R$ 500,00**
        - Despesas: **R$ 250,00** (R$ 200,00 pagos, R$ 50,00 pendentes)
        - Resultado: **R$ 250,00**

        Previsão para o fim do mês: **R$ 2.200,00**. Tá no controle, só não vacila!
        `,
        messages: await convertToModelMessages(messages),
        // Client do usuário (RLS) + userId explícito: mesmas ferramentas do bot do Telegram
        tools: buildFinanceTools(supabase, user.id),
    })

    return result.toUIMessageStreamResponse({
        // Não envia o raciocínio interno (modelos gpt-oss) para o navegador
        sendReasoning: false,
        onError: (error) => {
            console.error('[api/chat]', error)
            return describeAIError(error).message
        },
    })
}
