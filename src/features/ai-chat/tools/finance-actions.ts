import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'
import { scopeToUser, todayISO } from '@/features/bank-accounts/services/balances'
import { fetchCardsOverview, keyToCompetencia, type Invoice } from '@/features/credit-cards/services/invoices'
import { saveBudget, removeBudget } from '@/features/budgets/services/budgets'

/**
 * Ações do Amigão que movem dinheiro ou alteram dados (chat e Telegram).
 *
 * Regras de segurança:
 * - `supabase` é o client DO USUÁRIO (cookies no chat; token curto no Telegram): a RLS e as
 *   RPCs (que usam auth.uid()) garantem o dono. scopeToUser/`usuario_id` são a segunda camada.
 * - Toda ação tem prévia: sem `confirmado: true` nada é gravado e a ferramenta devolve o resumo
 *   para o usuário confirmar. O modelo só pode confirmar depois de um "sim" explícito.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const validDate = (d?: string | null) => (d && DATE_RE.test(d.slice(0, 10)) ? d.slice(0, 10) : null)
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const br = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')

/** Acha pelo nome (sem acento/caixa): exato, depois "contém" nos dois sentidos. */
export function findByName<T extends { nome: string }>(list: T[], name: string | null | undefined): T | undefined {
    if (!name?.trim()) return undefined
    const n = norm(name)
    return list.find(i => norm(i.nome) === n)
        ?? list.find(i => norm(i.nome).includes(n))
        ?? list.find(i => n.includes(norm(i.nome)))
}

const confirmado = z.boolean().nullish().describe(
    'Só envie true DEPOIS que o usuário confirmou explicitamente a prévia ("sim", "pode", "confirma"). Na primeira chamada, omita.'
)

const preview = (resumo: string) => ({
    precisa_confirmacao: true,
    resumo,
    instrucao: 'Mostre o resumo ao usuário e pergunte se confirma. Só chame de novo com confirmado=true após um sim explícito.',
})

type Conta = { id: string; nome: string; padrao: boolean }

async function loadAccounts(supabase: SupabaseClient, userId: string): Promise<Conta[]> {
    const { data, error } = await scopeToUser(supabase.from('contas_bancarias').select('id, nome, padrao'), userId)
    if (error) throw new Error(`Erro ao buscar contas: ${error.message}`)
    return (data ?? []) as Conta[]
}

function pickAccount(contas: Conta[], nome?: string | null): { conta?: Conta; erro?: string } {
    if (nome) {
        const conta = findByName(contas, nome)
        return conta ? { conta } : { erro: `Não achei a conta "${nome}". Contas: ${contas.map(c => c.nome).join(', ') || 'nenhuma'}.` }
    }
    const conta = contas.find(c => c.padrao) ?? (contas.length === 1 ? contas[0] : undefined)
    return conta ? { conta } : { erro: `Qual conta? Contas: ${contas.map(c => c.nome).join(', ') || 'nenhuma cadastrada'}.` }
}

// ---------- Pagar fatura ----------

export const payInvoiceSchema = z.object({
    cartao_nome: z.string().describe('Nome do cartão (ex.: "Nubank").'),
    conta_nome: z.string().nullish().describe('Conta que paga. Padrão: a conta padrão.'),
    valor: z.number().positive().nullish().describe('Valor a pagar. Omita para pagar a fatura inteira; menor = pagamento parcial (o resto vai para a próxima fatura).'),
    competencia: z.string().nullish().describe('Mês da fatura em YYYY-MM. Omita para a fatura a pagar mais antiga (ou a atual).'),
    data_pagamento: z.string().nullish().describe('YYYY-MM-DD. Padrão: hoje.'),
    confirmado,
})

export async function payInvoiceCore(supabase: SupabaseClient, userId: string, p: z.infer<typeof payInvoiceSchema>) {
    const today = todayISO()
    const { cards } = await fetchCardsOverview(supabase, today, userId)
    const card = findByName(cards, p.cartao_nome)
    if (!card) return { success: false, erro: `Não achei o cartão "${p.cartao_nome}". Cartões: ${cards.map(c => c.nome).join(', ') || 'nenhum'}.` }

    const aPagar = (i: Invoice) => i.em_aberto > 0 && i.status !== 'futura'
    const invoice = p.competencia
        ? card.invoices.find(i => i.key === p.competencia!.slice(0, 7))
        : card.fatura_pendente ?? card.invoices.find(aPagar) ?? card.fatura_atual
    if (!invoice || invoice.em_aberto <= 0) return { success: false, erro: `Não há valor em aberto na fatura ${invoice ? invoice.key : ''} do ${card.nome}.`.replace('  ', ' ') }
    if (invoice.pagamento) return { success: false, erro: `A fatura ${invoice.key} do ${card.nome} já tem um pagamento. Para refazer, estorne no app (Cartões).` }

    const contas = await loadAccounts(supabase, userId)
    const { conta, erro } = pickAccount(contas, p.conta_nome)
    if (!conta) return { success: false, erro }

    const valor = p.valor ?? invoice.em_aberto
    if (valor > invoice.em_aberto + 0.001) return { success: false, erro: `O valor máximo desta fatura é ${formatCurrency(invoice.em_aberto)}.` }
    const data = validDate(p.data_pagamento) ?? today
    const parcial = valor < invoice.em_aberto - 0.001

    if (!p.confirmado) {
        return preview(
            `Pagar ${formatCurrency(valor)} da fatura ${invoice.key.split('-').reverse().join('/')} do ${card.nome} (vence ${br(invoice.vencimento)}, em aberto ${formatCurrency(invoice.em_aberto)}) com a conta ${conta.nome}, em ${br(data)}.`
            + (parcial ? ` Pagamento parcial: ${formatCurrency(invoice.em_aberto - valor)} vão para a próxima fatura.` : '')
        )
    }

    const { error } = await supabase.rpc('pagar_fatura', {
        p_cartao_id: card.id,
        p_competencia: keyToCompetencia(invoice.key),
        p_conta_id: conta.id,
        p_data_pagamento: data,
        p_transacao_ids: invoice.compras.filter(c => c.status !== 'liquidado').map(c => c.id),
        p_valor: parcial ? valor : null,
    })
    if (error) return { success: false, erro: error.message }
    return { success: true, cartao: card.nome, fatura: invoice.key, valor, conta: conta.nome, parcial }
}

// ---------- Cofrinho ----------

export const savingsMovementSchema = z.object({
    cofrinho_nome: z.string().describe('Nome do cofrinho (ex.: "Reserva de Emergência").'),
    tipo: z.enum(['aporte', 'resgate']).describe('aporte = guardar dinheiro; resgate = tirar.'),
    valor: z.number().positive(),
    conta_nome: z.string().nullish().describe('Conta de onde sai (aporte) ou para onde vai (resgate). Padrão: a conta padrão.'),
    confirmado,
})

export async function savingsMovementCore(supabase: SupabaseClient, userId: string, p: z.infer<typeof savingsMovementSchema>) {
    const { data, error } = await scopeToUser(supabase.from('cofrinhos').select('id, nome, saldo_atual'), userId)
    if (error) throw new Error(`Erro ao buscar cofrinhos: ${error.message}`)
    const cofrinhos = (data ?? []) as Array<{ id: string; nome: string; saldo_atual: number | string }>
    const cofrinho = findByName(cofrinhos, p.cofrinho_nome)
    if (!cofrinho) return { success: false, erro: `Não achei o cofrinho "${p.cofrinho_nome}". Cofrinhos: ${cofrinhos.map(c => c.nome).join(', ') || 'nenhum'}.` }
    if (p.tipo === 'resgate' && p.valor > Number(cofrinho.saldo_atual)) {
        return { success: false, erro: `O cofrinho ${cofrinho.nome} tem só ${formatCurrency(cofrinho.saldo_atual)}.` }
    }

    const { conta, erro } = pickAccount(await loadAccounts(supabase, userId), p.conta_nome)
    if (!conta) return { success: false, erro }

    if (!p.confirmado) {
        return preview(p.tipo === 'aporte'
            ? `Guardar ${formatCurrency(p.valor)} no cofrinho ${cofrinho.nome}, saindo da conta ${conta.nome}.`
            : `Resgatar ${formatCurrency(p.valor)} do cofrinho ${cofrinho.nome} para a conta ${conta.nome}.`)
    }

    const { error: rpcError } = await supabase.rpc('registrar_movimento_cofrinho', {
        p_cofrinho_id: cofrinho.id,
        p_tipo: p.tipo,
        p_valor: p.valor,
        p_conta_id: conta.id,
        p_data: new Date().toISOString(),
    })
    if (rpcError) return { success: false, erro: rpcError.message }
    return { success: true, cofrinho: cofrinho.nome, tipo: p.tipo, valor: p.valor, conta: conta.nome }
}

// ---------- Orçamentos ----------

export const setBudgetSchema = z.object({
    categoria_nome: z.string().describe('Categoria de despesa (ex.: "Alimentação").'),
    valor_mensal: z.number().positive().describe('Limite por mês.'),
    tipo: z.enum(['PF', 'PJ']).nullish().describe('Perfil. Omita para PF e PJ.'),
    confirmado,
})

export const removeBudgetSchema = z.object({
    categoria_nome: z.string(),
    confirmado,
})

async function findExpenseCategory(supabase: SupabaseClient, userId: string, nome: string) {
    const { data, error } = await supabase
        .from('categorias')
        .select('id, nome')
        .or(`usuario_id.eq.${userId},usuario_id.is.null`)
        .eq('tipo', 'despesa')
    if (error) throw new Error(`Erro ao buscar categorias: ${error.message}`)
    const list = (data ?? []) as Array<{ id: string; nome: string }>
    return { categoria: findByName(list, nome), todas: list }
}

export async function setBudgetCore(supabase: SupabaseClient, userId: string, p: z.infer<typeof setBudgetSchema>) {
    if (!UUID_RE.test(userId)) throw new Error('Usuário inválido.')
    const { categoria, todas } = await findExpenseCategory(supabase, userId, p.categoria_nome)
    if (!categoria) return { success: false, erro: `Não achei a categoria "${p.categoria_nome}". Categorias: ${todas.map(c => c.nome).join(', ')}.` }

    const { data: atual, error } = await scopeToUser(supabase
        .from('orcamentos')
        .select('id, valor_mensal'), userId)
        .eq('categoria_id', categoria.id)
        .is('removido_em', null)
        .maybeSingle()
    if (error) throw new Error(`Erro ao buscar orçamento: ${error.message}`)

    if (!p.confirmado) {
        return preview(atual
            ? `Alterar o orçamento de ${categoria.nome} de ${formatCurrency(atual.valor_mensal)} para ${formatCurrency(p.valor_mensal)} por mês${p.tipo ? ` (${p.tipo})` : ''}.`
            : `Criar orçamento de ${formatCurrency(p.valor_mensal)} por mês para ${categoria.nome}${p.tipo ? ` (${p.tipo})` : ''}.`)
    }

    await saveBudget(supabase, { categoria_id: categoria.id, valor_mensal: p.valor_mensal, tipo: p.tipo ?? null }, atual?.id)
    return { success: true, categoria: categoria.nome, valor_mensal: p.valor_mensal, acao: atual ? 'alterado' : 'criado' }
}

export async function removeBudgetCore(supabase: SupabaseClient, userId: string, p: z.infer<typeof removeBudgetSchema>) {
    const { categoria } = await findExpenseCategory(supabase, userId, p.categoria_nome)
    if (!categoria) return { success: false, erro: `Não achei a categoria "${p.categoria_nome}".` }
    const { data: atual, error } = await scopeToUser(supabase.from('orcamentos').select('id, valor_mensal'), userId)
        .eq('categoria_id', categoria.id)
        .is('removido_em', null)
        .maybeSingle()
    if (error) throw new Error(`Erro ao buscar orçamento: ${error.message}`)
    if (!atual) return { success: false, erro: `Não há orçamento para ${categoria.nome}.` }
    if (!p.confirmado) return preview(`Remover o orçamento de ${formatCurrency(atual.valor_mensal)} de ${categoria.nome}.`)
    await removeBudget(supabase, atual.id)
    return { success: true, categoria: categoria.nome }
}

// ---------- Transferência ----------

export const transferSchema = z.object({
    conta_origem: z.string().describe('Conta de onde sai.'),
    conta_destino: z.string().describe('Conta para onde vai.'),
    valor: z.number().positive(),
    data: z.string().nullish().describe('YYYY-MM-DD. Padrão: hoje.'),
    descricao: z.string().nullish(),
    confirmado,
})

export async function transferCore(supabase: SupabaseClient, userId: string, p: z.infer<typeof transferSchema>) {
    const contas = await loadAccounts(supabase, userId)
    const origem = findByName(contas, p.conta_origem)
    const destino = findByName(contas, p.conta_destino)
    if (!origem || !destino) return { success: false, erro: `Não achei ${!origem ? `"${p.conta_origem}"` : `"${p.conta_destino}"`}. Contas: ${contas.map(c => c.nome).join(', ')}.` }
    if (origem.id === destino.id) return { success: false, erro: 'Origem e destino precisam ser contas diferentes.' }
    const data = validDate(p.data) ?? todayISO()

    if (!p.confirmado) return preview(`Transferir ${formatCurrency(p.valor)} de ${origem.nome} para ${destino.nome} em ${br(data)}.`)

    const { error } = await supabase.from('transferencias').insert([{
        usuario_id: userId,
        conta_origem_id: origem.id,
        conta_destino_id: destino.id,
        valor: p.valor,
        data,
        descricao: p.descricao?.trim() || null,
    }])
    if (error) return { success: false, erro: error.message }
    return { success: true, origem: origem.nome, destino: destino.nome, valor: p.valor, data }
}

// ---------- Excluir lançamento ----------

export const deleteTransactionSchema = z.object({
    transacao_id: z.string().describe('id obtido com search_transactions.'),
    confirmado,
})

export async function deleteTransactionCore(supabase: SupabaseClient, userId: string, p: z.infer<typeof deleteTransactionSchema>) {
    if (!UUID_RE.test(p.transacao_id)) return { success: false, erro: 'id inválido. Use search_transactions para obter o id.' }
    const { data: tx, error } = await scopeToUser(supabase
        .from('transacoes')
        .select('id, descricao, valor, tipo_transacao, data_vencimento, total_parcelas, fatura_pagamento_id'), userId)
        .eq('id', p.transacao_id)
        .maybeSingle()
    if (error) throw new Error(`Erro ao buscar transação: ${error.message}`)
    if (!tx) return { success: false, erro: 'Transação não encontrada.' }
    if (tx.total_parcelas) return { success: false, erro: 'Parcelamentos devem ser excluídos pelo app, para escolher se apaga só esta ou todas as parcelas.' }
    if (tx.fatura_pagamento_id) return { success: false, erro: 'Esta compra já foi paga numa fatura. Estorne a fatura no app antes.' }

    if (!p.confirmado) {
        return preview(`Excluir a ${tx.tipo_transacao} "${tx.descricao}" de ${formatCurrency(tx.valor)} (${br(tx.data_vencimento)}). Não dá para desfazer.`)
    }

    const { error: delError } = await scopeToUser(supabase.from('transacoes').delete(), userId).eq('id', tx.id)
    if (delError) return { success: false, erro: delError.message }
    return { success: true, excluida: tx.descricao, valor: Number(tx.valor) }
}
