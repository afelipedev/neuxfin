import { createClient } from '@/lib/supabase/client'

export interface NewTransfer {
    conta_origem_id: string
    conta_destino_id: string
    valor: number
    data: string
    descricao?: string | null
}

const supabase = createClient()

export interface Transfer extends NewTransfer {
    id: string
}

function validateTransfer(transfer: NewTransfer) {
    if (transfer.conta_origem_id === transfer.conta_destino_id) {
        throw new Error('Escolha contas diferentes para origem e destino')
    }
    if (!(transfer.valor > 0)) {
        throw new Error('O valor deve ser maior que zero')
    }
}

export async function getTransfer(id: string): Promise<Transfer> {
    const { data, error } = await supabase
        .from('transferencias')
        .select('id, conta_origem_id, conta_destino_id, valor, data, descricao')
        .eq('id', id)
        .single()
    if (error) throw error
    return { ...data, valor: Number(data.valor) } as Transfer
}

/** Edita contas, valor, data e descrição. O trigger do banco revalida as contas do usuário. */
export async function updateTransfer(id: string, transfer: NewTransfer) {
    validateTransfer(transfer)
    const { error } = await supabase
        .from('transferencias')
        .update({ ...transfer, descricao: transfer.descricao || null })
        .eq('id', id)
    if (error) throw error
}

/** Cria uma transferência entre contas (usuario_id é preenchido pelo banco com auth.uid()). */
export async function createTransfer(transfer: NewTransfer) {
    validateTransfer(transfer)
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
