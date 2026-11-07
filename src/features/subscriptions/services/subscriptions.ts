import { createClient } from '@/lib/supabase/client'
import { displaySubscriptionStatus, monthlyCost, subscriptionOccurrences } from './schedule'
import { todayISO } from '@/features/bank-accounts/services/balances'

export interface Subscription {
    id: string
    usuario_id: string
    nome: string
    valor: number
    data_vencimento_dia: number | null
    categoria_id: string | null
    cartao_id: string | null
    /** Conta debitada quando não é cobrada no cartão (vazia = conta padrão do usuário) */
    conta_id: string | null
    /** Primeira cobrança possível; âncora de anual/trimestral/semanal */
    data_inicio: string
    /** Última data possível de cobrança (vazia = sem fim) */
    data_fim: string | null
    status: 'ativo' | 'pausado' | 'cancelado'
    descricao: string | null
    frequencia: 'mensal' | 'anual' | 'semanal' | 'trimestral'
    url: string | null
    icone: string | null
    cor: string | null
    created_at: string
    categoria?: {
        id: string
        nome: string
        icone?: string
        cor?: string
    }
    cartao?: {
        id: string
        nome: string
        bandeira?: string
        cor?: string
    }
    conta?: {
        id: string
        nome: string
    } | null
}

export interface SubscriptionStats {
    custoMensal: number
    totalAtivas: number
    totalPausadas: number
    totalCanceladas: number
}

const supabase = createClient()

/**
 * Busca todas as assinaturas do usuário
 */
export async function getSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
        .from('assinaturas')
        .select(`
            *,
            categoria:categorias(*),
            cartao:cartoes_credito(*),
            conta:contas_bancarias(id, nome)
        `)
        .order('nome')

    if (error) throw error
    return data as Subscription[]
}

/**
 * Busca uma assinatura por ID
 */
export async function getSubscriptionById(id: string): Promise<Subscription | null> {
    const { data, error } = await supabase
        .from('assinaturas')
        .select(`
            *,
            categoria:categorias(*),
            cartao:cartoes_credito(*),
            conta:contas_bancarias(id, nome)
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as Subscription
}

/**
 * Busca estatísticas das assinaturas
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
    const { data, error } = await supabase
        .from('assinaturas')
        .select('valor, status, frequencia, data_fim')

    if (error) throw error
    const today = todayISO()

    const stats: SubscriptionStats = {
        custoMensal: 0,
        totalAtivas: 0,
        totalPausadas: 0,
        totalCanceladas: 0
    };

    ((data ?? []) as Array<Pick<Subscription, 'valor' | 'status' | 'frequencia' | 'data_fim'>>).forEach((sub) => {
        const valorMensal = monthlyCost(sub.valor, sub.frequencia)
        const status = displaySubscriptionStatus(sub, today)

        if (status === 'ativo') {
            stats.custoMensal = Math.round((stats.custoMensal + valorMensal) * 100) / 100
            stats.totalAtivas++
        } else if (status === 'pausado') {
            stats.totalPausadas++
        } else {
            // Canceladas e encerradas (data_fim no passado)
            stats.totalCanceladas++
        }
    })

    return stats
}

/**
 * Cria uma nova assinatura
 */
export async function createSubscription(
    subscription: Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao' | 'conta'>
): Promise<Subscription> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
        .from('assinaturas')
        .insert([{ ...subscription, usuario_id: user.id }])
        .select(`
            *,
            categoria:categorias(*),
            cartao:cartoes_credito(*),
            conta:contas_bancarias(id, nome)
        `)
        .single()

    if (error) throw error
    return data as Subscription
}

/**
 * Atualiza uma assinatura
 */
export async function updateSubscription(
    id: string,
    updates: Partial<Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao' | 'conta'>>
): Promise<Subscription> {
    const { data, error } = await supabase
        .from('assinaturas')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            categoria:categorias(*),
            cartao:cartoes_credito(*),
            conta:contas_bancarias(id, nome)
        `)
        .single()

    if (error) throw error
    return data as Subscription
}

/**
 * Exclui uma assinatura
 */
export async function deleteSubscription(id: string): Promise<void> {
    const { error } = await supabase
        .from('assinaturas')
        .delete()
        .eq('id', id)

    if (error) throw error
}

/**
 * Lança as despesas das assinaturas ativas que vencem no mês, conforme a frequência.
 * Idempotente: o índice único (assinatura_id, data_vencimento) ignora as já lançadas,
 * então pode rodar automaticamente a cada acesso.
 * Conta: cartão da assinatura → conta da assinatura → conta padrão → sem conta.
 * Retorna quantas despesas foram criadas.
 */
export async function generateExpensesFromSubscriptions(
    month: number,
    year: number
): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado')

    const [subsRes, contaRes] = await Promise.all([
        supabase
            .from('assinaturas')
            .select('id, nome, valor, frequencia, data_vencimento_dia, data_inicio, data_fim, categoria_id, cartao_id, conta_id')
            .eq('status', 'ativo'),
        supabase
            .from('contas_bancarias')
            .select('id')
            .eq('padrao', true)
            .maybeSingle(),
    ])
    if (subsRes.error) throw subsRes.error
    if (contaRes.error) throw contaRes.error
    const contaPadrao = contaRes.data?.id ?? null

    type SubRow = Pick<Subscription, 'id' | 'nome' | 'valor' | 'frequencia' | 'data_vencimento_dia' | 'data_inicio' | 'data_fim' | 'categoria_id' | 'cartao_id' | 'conta_id'>
    const rows = ((subsRes.data ?? []) as SubRow[]).flatMap(sub =>
        subscriptionOccurrences(sub, year, month).map(data_vencimento => ({
            usuario_id: user.id,
            assinatura_id: sub.id,
            descricao: `[Assinatura] ${sub.nome}`,
            valor: Number(sub.valor),
            tipo: 'PF' as const,
            tipo_transacao: 'despesa' as const,
            categoria_id: sub.categoria_id ?? null,
            cartao_id: sub.cartao_id ?? null,
            // No cartão a despesa entra na fatura; fora dele, debita uma conta
            conta_id: sub.cartao_id ? null : (sub.conta_id ?? contaPadrao),
            data_vencimento,
            data_pagamento: null,
            status: 'pendente' as const,
            is_recorrente: true,
        }))
    )
    if (rows.length === 0) return 0

    const { data, error } = await supabase
        .from('transacoes')
        .upsert(rows, { onConflict: 'assinatura_id,data_vencimento', ignoreDuplicates: true })
        .select('id')

    if (error) throw error
    return data?.length ?? 0
}
