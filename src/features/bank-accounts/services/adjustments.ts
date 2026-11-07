import { createClient } from '@/lib/supabase/client'
import { toCents } from './balances'

export interface NewAdjustment {
    conta_id: string
    /** Com sinal: positivo aumenta o saldo, negativo diminui */
    valor: number
    data: string
    descricao?: string | null
}

const supabase = createClient()

/** Registra um ajuste de saldo (usuario_id vem de auth.uid() no banco). */
export async function createAdjustment(adjustment: NewAdjustment) {
    if (toCents(adjustment.valor) === 0) {
        throw new Error('O saldo informado já é igual ao saldo calculado')
    }
    const { data, error } = await supabase
        .from('ajustes_saldo')
        .insert([{ ...adjustment, descricao: adjustment.descricao?.trim() || null }])
        .select()
        .single()
    if (error) throw error
    return data
}

/** Desfaz um ajuste (soft delete: fica no histórico, mas sai do saldo). */
export async function removeAdjustment(id: string) {
    const { error } = await supabase
        .from('ajustes_saldo')
        .update({ removido_em: new Date().toISOString() })
        .eq('id', id)
        .is('removido_em', null)
    if (error) throw error
}
