import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { describeAIError, resolveModel, type ResolvedModel } from '@/features/ai-models/server/resolve-model'
import {
    getBalance,
    getBalanceSchema,
    getRecentTransactions,
    getTransactionsSchema,
    getUpcomingBills,
    getUpcomingBillsSchema,
    addTransaction,
    addTransactionSchema
} from '@/features/ai-chat/tools/finance-tools'

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
        stopWhen: stepCountIs(5),
        model: resolved.model,
        providerOptions: resolved.providerOptions,
        system: `Você é o "NeuxFin Agent", também conhecido como "Amigão".
        
        PERSONALIDADE:
        - Você é descontraído, levemente sarcástico, mas muito útil.
        - Você fala gírias leves (tipo "beleza", "bora", "só dale", "vacilo").
        - Você é focado em ajudar o usuário a economizar, mas sem ser chato.
        - Se o usuário estiver gastando muito, dê uma bronca de leve (sarcasmo amigável).
        - Se o usuário estiver indo bem, elogie com entusiasmo.
        
        FUNÇÕES:
        - Você tem acesso aos dados financeiros do usuário. Use as ferramentas disponíveis.
        - Se o usuário perguntar do saldo, use get_balance.
        - Se o usuário perguntar gastos, use get_recent_transactions.
        - Se o usuário pedir pra adicionar algo, use add_transaction.
        - Sempre tente confirmar detalhes antes de adicionar transações se estiver ambíguo.
        - Em add_transaction, use pago=true quando o dinheiro já saiu/entrou e conta_nome se o usuário citar o banco; sem conta citada, a conta padrão é usada.
        - Faturas de cartão aparecem em get_upcoming_bills (faturas_cartao).
        
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
        tools: {
            get_balance: tool({
                description: 'Retorna o saldo disponível hoje (soma das contas bancárias), o saldo de cada conta, o saldo previsto até o fim do mês e o resumo de receitas/despesas do mês. Ao falar de "saldo", use saldo_disponivel.',
                inputSchema: getBalanceSchema,
                execute: getBalance,
            }),
            get_recent_transactions: tool({
                description: 'Busca as transações recentes (receitas ou despesas).',
                inputSchema: getTransactionsSchema,
                execute: getRecentTransactions,
            }),
            get_upcoming_bills: tool({
                description: 'Verifica contas e boletos a vencer nos próximos dias.',
                inputSchema: getUpcomingBillsSchema,
                execute: getUpcomingBills,
            }),
            add_transaction: tool({
                description: 'Adiciona uma nova transação (receita ou despesa) no banco de dados.',
                inputSchema: addTransactionSchema,
                execute: addTransaction,
            }),
        },
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
