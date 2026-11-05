import { createClient } from '@/lib/supabase/client'

export interface NewTransfer {
    conta_origem_id: string
    conta_destino_id: string
    valor: number
    data: string
    descricao?: string | null
}

const supabase = createClient()

/** Cria uma transferência entre contas (usuario_id é preenchido pelo banco com auth.uid()). */
export async function createTransfer(transfer: NewTransfer) {
    if (transfer.conta_origem_id === transfer.conta_destino_id) {
        throw new Error('Escolha contas diferentes para origem e destino')
    }
    if (!(transfer.valor > 0)) {
        throw new Error('O valor deve ser maior que zero')
    }
    const { data, error } = await supabase
        .from('transferencias')
        .insert([{ ...transfer, descricao: transfer.descricao || null }])
        .select()
        .single()
    if (error) throw error
    return data
}

export async function deleteTransfer(id: string) {
    const { error } = await supabase.from('transferencias').delete().eq('id', id)
    if (error) throw error
}
