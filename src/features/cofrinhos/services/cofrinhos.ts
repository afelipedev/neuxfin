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
    /** Conta debitada (aporte) ou creditada (resgate). Nulo = não movimenta conta. */
    conta_id: string | null
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

/**
 * Registra aporte/resgate de forma atômica no banco (RPC registrar_movimento_cofrinho):
 * grava o movimento, atualiza o saldo do cofrinho com lock de linha e valida o
 * saldo no resgate. Com conta_id, o aporte sai da conta e o resgate entra nela.
 */
export async function addCofrinhoTransaction(transaction: Omit<CofrinhoTransaction, 'id' | 'created_at'>) {
    const { data, error } = await supabase.rpc('registrar_movimento_cofrinho', {
        p_cofrinho_id: transaction.cofrinho_id,
        p_tipo: transaction.tipo,
        p_valor: transaction.valor,
        p_conta_id: transaction.conta_id,
        p_data: transaction.data
    })

    if (error) throw error
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
