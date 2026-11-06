import type { SupabaseClient } from '@supabase/supabase-js'
import { fromCents, toCents } from '@/features/bank-accounts/services/balances'

/** CDI anual (%) usado quando o perfil não tem taxa configurada (mesmo default da coluna perfis.configurar_cdi). */
export const DEFAULT_CDI_ANUAL = 13.15

/** Taxa válida (0 a 100% a.a.) ou o padrão. */
export function normalizeCdi(value: unknown): number {
    // Number(null) e Number('') dão 0: ausência de valor não pode virar CDI 0%
    if (value === null || value === undefined || value === '') return DEFAULT_CDI_ANUAL
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : DEFAULT_CDI_ANUAL
}

/**
 * Projeção do saldo rendendo 100% do CDI, com juros compostos e sem novos aportes:
 * saldo × (1 + CDI)^(meses/12). Taxa anual em % (ex.: 13.15).
 */
export function projectSavings(saldo: number, cdiAnualPct: number, meses = 12) {
    const fator = Math.pow(1 + cdiAnualPct / 100, meses / 12)
    const projetadoCents = Math.round(toCents(saldo) * fator)
    return {
        projetado: fromCents(projetadoCents),
        rendimento: fromCents(projetadoCents - toCents(saldo)),
        /** Taxa mensal equivalente, em % (ex.: 1.03) */
        taxa_mensal: Math.round((Math.pow(1 + cdiAnualPct / 100, 1 / 12) - 1) * 10000) / 100,
    }
}

/** CDI configurado pelo usuário logado em Configurações → Perfil. */
export async function fetchCdiRate(supabase: SupabaseClient): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return DEFAULT_CDI_ANUAL
    const { data, error } = await supabase
        .from('perfis')
        .select('configurar_cdi')
        .eq('id', user.id)
        .maybeSingle()
    if (error) throw error
    return normalizeCdi(data?.configurar_cdi)
}
