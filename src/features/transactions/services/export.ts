import { format } from 'date-fns'
import { parseLocalDate } from '@/lib/utils'
import { deriveStatus } from '@/features/bank-accounts/services/balances'
import { getAllTransactions, type TransactionFilters } from './transactions'

const STATUS_LABEL = { liquidado: 'Pago/Recebido', pendente: 'Pendente', atrasado: 'Atrasado' } as const

/**
 * Exporta para XLSX TODAS as transações que atendem aos filtros (não só a página visível).
 * O xlsx é importado sob demanda para não pesar no bundle inicial.
 */
export async function exportTransactionsXlsx(
    filters: Omit<TransactionFilters, 'page' | 'pageSize'>,
    fileName: string
): Promise<number> {
    const [XLSX, transactions] = await Promise.all([import('xlsx'), getAllTransactions(filters)])

    const rows = transactions.map(t => ({
        Data: format(parseLocalDate(t.data_vencimento), 'dd/MM/yyyy'),
        Descrição: t.descricao,
        Natureza: t.tipo_transacao === 'receita' ? 'Receita' : 'Despesa',
        Perfil: t.tipo,
        Categoria: t.categoria?.nome ?? '',
        'Conta/Cartão': t.conta?.nome ?? (t.cartao?.nome ? `Cartão ${t.cartao.nome}` : ''),
        Status: STATUS_LABEL[deriveStatus(t)],
        'Data pagamento': t.data_pagamento ? format(parseLocalDate(t.data_pagamento), 'dd/MM/yyyy') : '',
        Parcela: t.total_parcelas ? `${t.parcela_atual}/${t.total_parcelas}` : '',
        // Valor com sinal facilita somar na planilha
        Valor: t.tipo_transacao === 'receita' ? Number(t.valor) : -Number(t.valor)
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transações')
    XLSX.writeFile(wb, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
    return rows.length
}
