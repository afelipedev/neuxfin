import { createClient } from '@/lib/supabase/client'

export interface Cofrinho {
    id: string
    usuario_id: string
    nome: string
    objetivo: number | null
    saldo_atual: number
    cor: string
    icone: string
    descricao: string | null
    tipo_liquidez: string
    data_prevista: string | null
    created_at: string
}

export interface CofrinhoTransaction {
    id: string
    cofrinho_id: string
    tipo: 'aporte' | 'resgate'
    valor: number
    data: string
    created_at: string
}

const supabase = createClient()

export async function getCofrinhos() {
    const { data, error } = await supabase
        .from('cofrinhos')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Cofrinho[]
}

export async function createCofrinho(cofrinho: Omit<Cofrinho, 'id' | 'usuario_id' | 'saldo_atual' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Usuário não autenticado')
    }

    const { data, error } = await supabase
        .from('cofrinhos')
        .insert([{
            ...cofrinho,
            usuario_id: user.id,
            saldo_atual: 0
        }])
        .select()
        .single()

    if (error) throw error
    return data as Cofrinho
}

export async function updateCofrinho(id: string, updates: Partial<Cofrinho>) {
    const { data, error } = await supabase
        .from('cofrinhos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Cofrinho
}

export async function deleteCofrinho(id: string) {
    const { error } = await supabase
        .from('cofrinhos')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function addCofrinhoTransaction(transaction: Omit<CofrinhoTransaction, 'id' | 'created_at'>) {
    // 1. Inserir a transação
    const { data, error: txError } = await supabase
        .from('cofrinho_transacoes')
        .insert([transaction])
        .select()
        .single()

    if (txError) throw txError

    // 2. Buscar o saldo atual do cofrinho
    const { data: cofrinho, error: fetchError } = await supabase
        .from('cofrinhos')
        .select('saldo_atual')
        .eq('id', transaction.cofrinho_id)
        .single()

    if (fetchError) throw fetchError

    // 3. Atualizar o saldo do cofrinho
    const novoSaldo = transaction.tipo === 'aporte'
        ? Number(cofrinho.saldo_atual) + Number(transaction.valor)
        : Number(cofrinho.saldo_atual) - Number(transaction.valor)

    const { error: updateError } = await supabase
        .from('cofrinhos')
        .update({ saldo_atual: novoSaldo })
        .eq('id', transaction.cofrinho_id)

    if (updateError) throw updateError

    return data as CofrinhoTransaction
}

export async function getCofrinhoTransactions(cofrinhoId: string) {
    const { data, error } = await supabase
        .from('cofrinho_transacoes')
        .select('*')
        .eq('cofrinho_id', cofrinhoId)
        .order('data', { ascending: false })

    if (error) throw error
    return data as CofrinhoTransaction[]
}
