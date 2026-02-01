import { createClient } from '@/lib/supabase/client'
import { createTransaction } from '@/features/transactions/services/transactions'
import { formatDateToISO } from '@/lib/utils'

export interface Subscription {
    id: string
    usuario_id: string
    nome: string
    valor: number
    data_vencimento_dia: number | null
    categoria_id: string | null
    cartao_id: string | null
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
            cartao:cartoes_credito(*)
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
            cartao:cartoes_credito(*)
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
        .select('valor, status, frequencia')

    if (error) throw error

    const stats: SubscriptionStats = {
        custoMensal: 0,
        totalAtivas: 0,
        totalPausadas: 0,
        totalCanceladas: 0
    };

    (data || []).forEach((sub: any) => {
        // Calcular custo mensal baseado na frequência
        let valorMensal = Number(sub.valor)

        if (sub.frequencia === 'anual') {
            valorMensal = valorMensal / 12
        } else if (sub.frequencia === 'trimestral') {
            valorMensal = valorMensal / 3
        } else if (sub.frequencia === 'semanal') {
            valorMensal = valorMensal * 4
        }

        if (sub.status === 'ativo') {
            stats.custoMensal += valorMensal
            stats.totalAtivas++
        } else if (sub.status === 'pausado') {
            stats.totalPausadas++
        } else if (sub.status === 'cancelado') {
            stats.totalCanceladas++
        }
    })

    return stats
}

/**
 * Cria uma nova assinatura
 */
export async function createSubscription(
    subscription: Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao'>
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
            cartao:cartoes_credito(*)
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
    updates: Partial<Omit<Subscription, 'id' | 'usuario_id' | 'created_at' | 'categoria' | 'cartao'>>
): Promise<Subscription> {
    const { data, error } = await supabase
        .from('assinaturas')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            categoria:categorias(*),
            cartao:cartoes_credito(*)
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
 * Gera despesas para as assinaturas ativas do mês
 * Esta função deve ser chamada mensalmente ou quando o usuário acessar as despesas
 */
export async function generateExpensesFromSubscriptions(
    month: number,
    year: number
): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Usuário não autenticado')
    }

    // Buscar assinaturas ativas
    const { data: subscriptions, error: subError } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('status', 'ativo')

    if (subError) throw subError

    // Verificar quais assinaturas já têm despesas geradas para o mês
    const startDate = formatDateToISO(new Date(year, month - 1, 1))
    const endDate = formatDateToISO(new Date(year, month, 0))

    const { data: existingExpenses, error: expError } = await supabase
        .from('transacoes')
        .select('descricao')
        .eq('tipo_transacao', 'despesa')
        .eq('is_recorrente', true)
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate)
        .ilike('descricao', '%[Assinatura]%')

    if (expError) throw expError

    const existingDescriptions = new Set(
        existingExpenses?.map(e => e.descricao) || []
    )

    let createdCount = 0

    for (const sub of subscriptions || []) {
        const description = `[Assinatura] ${sub.nome}`

        // Pular se já existe despesa para esta assinatura neste mês
        if (existingDescriptions.has(description)) continue

        // Calcular data de vencimento
        const diaVencimento = sub.data_vencimento_dia || 1
        const dataVencimento = new Date(year, month - 1, diaVencimento)

        // Criar a despesa
        try {
            await createTransaction({
                descricao: description,
                valor: Number(sub.valor),
                tipo: 'PF',
                tipo_transacao: 'despesa',
                categoria_id: sub.categoria_id || '',
                conta_id: null,
                cartao_id: sub.cartao_id,
                data_vencimento: formatDateToISO(dataVencimento),
                data_pagamento: null,
                status: 'pendente',
                is_recorrente: true,
                parcela_atual: null,
                total_parcelas: null
            })
            createdCount++
        } catch (e) {
            console.error(`Erro ao criar despesa para assinatura ${sub.nome}:`, e)
        }
    }

    return createdCount
}
