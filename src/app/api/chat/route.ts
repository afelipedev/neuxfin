import { openai } from '@ai-sdk/openai'
import { streamText, tool } from 'ai'
import { z } from 'zod'
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
    const { messages } = await req.json()

    const result = streamText({
        model: openai('gpt-4o-mini'),
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
        
        FORMATAÇÃO:
        - Use Markdown para negrito em valores (ex: **R$ 50,00**).
        - Seja conciso.
        `,
        messages,
        tools: {
            get_balance: tool({
                description: 'Verifica o saldo financeiro atual (receitas recebidas - despesas pagas).',
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

    return result.toUIMessageStreamResponse()
}
