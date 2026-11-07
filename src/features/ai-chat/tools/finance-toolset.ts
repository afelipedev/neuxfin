import { tool } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    addTransactionCore,
    addTransactionSchema,
    getBalanceCore,
    getBalanceSchema,
    getUpcomingBillsCore,
    getUpcomingBillsSchema,
} from './finance-tools'
import {
    getBudgetsCore,
    getCardsCore,
    getCardsSchema,
    getSavingsCore,
    getSavingsSchema,
    getSpendingByCategoryCore,
    getSpendingByCategorySchema,
    getSubscriptionsCore,
    getSubscriptionsSchema,
    markTransactionPaidCore,
    markTransactionPaidSchema,
    monthSchema,
    searchTransactionsCore,
    searchTransactionsSchema,
} from './finance-insights'

/**
 * Ferramentas do Amigão, usadas pelo chat do app e pelo bot do Telegram.
 * `userId` é sempre passado: com o client service-role (Telegram) ele isola os dados;
 * com o client do usuário (chat) o RLS já isola e o filtro é redundante.
 */
export function buildFinanceTools(supabase: SupabaseClient, userId: string) {
    return {
        get_balance: tool({
            description: 'Saldo disponível hoje (soma das contas), saldo de cada conta, saldo previsto para o fim do mês e resumo de receitas/despesas do mês. Ao falar de "saldo", use saldo_disponivel.',
            inputSchema: getBalanceSchema,
            execute: ({ month, year }) => getBalanceCore(supabase, month, year, userId),
        }),
        search_transactions: tool({
            description: 'Busca receitas e despesas com filtros (texto da descrição, tipo, status pendente/atrasado/pago, categoria, período). Sem filtros, traz as mais recentes. Use também para achar o id antes de mark_transaction_paid.',
            inputSchema: searchTransactionsSchema,
            execute: params => searchTransactionsCore(supabase, params, userId),
        }),
        get_spending_by_category: tool({
            description: 'Total de despesas (ou receitas) do mês agrupado por categoria, do maior para o menor, com percentual. Use para "onde estou gastando mais", "quanto gastei com mercado".',
            inputSchema: getSpendingByCategorySchema,
            execute: ({ month, year, tipo_transacao }) => getSpendingByCategoryCore(supabase, month, year, tipo_transacao ?? 'despesa', userId),
        }),
        get_upcoming_bills: tool({
            description: 'Contas a pagar e faturas de cartão que vencem nos próximos dias (inclui atrasadas).',
            inputSchema: getUpcomingBillsSchema,
            execute: ({ days }) => getUpcomingBillsCore(supabase, days && days > 0 ? Math.min(days, 90) : 7, userId),
        }),
        get_subscriptions: tool({
            description: 'Assinaturas (streaming, softwares, serviços recorrentes): quantidade, valor, frequência, próxima cobrança e custo mensal total das ativas.',
            inputSchema: getSubscriptionsSchema,
            execute: ({ status }) => getSubscriptionsCore(supabase, status ?? 'ativo', userId),
        }),
        get_credit_cards: tool({
            description: 'Cartões de crédito: limite usado e disponível, fatura atual e fatura a pagar (valor, vencimento, status).',
            inputSchema: getCardsSchema,
            execute: () => getCardsCore(supabase, userId),
        }),
        get_savings: tool({
            description: 'Cofrinhos (reservas e metas de economia): saldo guardado, objetivo e progresso.',
            inputSchema: getSavingsSchema,
            execute: () => getSavingsCore(supabase, userId),
        }),
        get_budgets: tool({
            description: 'Orçamentos por categoria do mês: limite, quanto já gastou, quanto resta e se estourou.',
            inputSchema: monthSchema,
            execute: ({ month, year }) => getBudgetsCore(supabase, month, year, userId),
        }),
        add_transaction: tool({
            description: 'Registra uma receita ou despesa. Para compra no cartão de crédito, informe cartao_nome.',
            inputSchema: addTransactionSchema,
            execute: params => addTransactionCore(supabase, userId, params),
        }),
        mark_transaction_paid: tool({
            description: 'Marca como paga/recebida uma conta pendente (ex.: "paguei a luz", "recebi o freela"). Antes, encontre o id com search_transactions (status pendente). Não serve para compras no cartão.',
            inputSchema: markTransactionPaidSchema,
            execute: params => markTransactionPaidCore(supabase, userId, params),
        }),
    }
}

/** Trecho do system prompt que explica quando usar cada ferramenta (chat e Telegram). */
export const FINANCE_TOOLS_GUIDE = `VOCÊ TEM ACESSO A TODO O APP NEUXFIN. Use as ferramentas sempre que a pergunta envolver dados do usuário:
- Saldo, contas bancárias, previsão do mês → get_balance
- Transações (procurar, listar, "quanto gastei no uber", pendentes, atrasadas) → search_transactions
- Onde gasto mais / gasto por categoria → get_spending_by_category
- Contas e faturas a vencer → get_upcoming_bills
- Assinaturas → get_subscriptions
- Cartões, limite, fatura → get_credit_cards
- Cofrinhos, reservas, metas de economia → get_savings
- Orçamentos e limites por categoria → get_budgets
- Registrar gasto/ganho → add_transaction (pago=true se o dinheiro já saiu/entrou; conta_nome se citar o banco; cartao_nome se foi no cartão de crédito)
- "Paguei X" / "recebi X" de algo que já estava lançado como pendente → search_transactions (status pendente) e depois mark_transaction_paid. Se não achar, registre com add_transaction.
Assinaturas, cartões, cofrinhos, orçamentos, contas e categorias SÃO assuntos financeiros: nunca diga que não pode ajudar com eles.
Se faltar o valor para registrar algo, pergunte. Nunca invente números: use só o que as ferramentas retornarem.`
