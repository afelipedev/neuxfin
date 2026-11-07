import { dateInMonthClamped, formatDateToISO, parseLocalDate } from '@/lib/utils'
import { fromCents, toCents } from '@/features/bank-accounts/services/balances'

export const MIN_INSTALLMENTS = 2
export const MAX_INSTALLMENTS = 48

export interface InstallmentBase {
    descricao: string
    valor: number | string
    data_vencimento: string
    status: 'liquidado' | 'pendente' | 'atrasado'
    data_pagamento: string | null
}

/**
 * Parcelas de uma compra, para gravar num único INSERT (atômico).
 * - `valor` é o TOTAL: dividido em centavos, a diferença de arredondamento fica na parcela 1.
 * - Mesmo dia nos meses seguintes, limitado ao último dia do mês (31 → 28/29/30).
 * - A parcela 1 recebe o id `paiId` e as demais apontam para ela (transacao_pai_id).
 * - Só a 1ª herda o status/pagamento; as futuras nascem pendentes.
 */
export function buildInstallments<T extends InstallmentBase>(base: T, totalParcelas: number, paiId: string) {
    const total = Math.trunc(totalParcelas)
    if (total < MIN_INSTALLMENTS || total > MAX_INSTALLMENTS) {
        throw new Error(`O parcelamento deve ter de ${MIN_INSTALLMENTS} a ${MAX_INSTALLMENTS} parcelas`)
    }

    const totalCents = toCents(base.valor)
    const baseCents = Math.floor(totalCents / total)
    const restoCents = totalCents - baseCents * total
    if (baseCents <= 0) throw new Error('Valor pequeno demais para parcelar')

    const dataBase = parseLocalDate(base.data_vencimento)

    return Array.from({ length: total }, (_, idx) => {
        const numero = idx + 1
        const isPai = numero === 1
        const vencimento = dateInMonthClamped(dataBase.getFullYear(), dataBase.getMonth() + idx, dataBase.getDate())
        return {
            ...base,
            ...(isPai ? { id: paiId } : {}),
            valor: fromCents(isPai ? baseCents + restoCents : baseCents),
            parcela_atual: numero,
            total_parcelas: total,
            data_vencimento: formatDateToISO(vencimento),
            descricao: `${base.descricao} (${numero}/${total})`,
            transacao_pai_id: isPai ? null : paiId,
            status: isPai ? base.status : ('pendente' as const),
            data_pagamento: isPai ? base.data_pagamento : null,
        }
    })
}
