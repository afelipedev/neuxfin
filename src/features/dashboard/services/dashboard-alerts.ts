import type { SupabaseClient } from '@supabase/supabase-js'
import { formatCurrency, formatDateToISO, parseLocalDate } from '@/lib/utils'
import { fromCents, toCents, todayISO } from '@/features/bank-accounts/services/balances'
import { type CardOverview, fetchCardsOverview } from '@/features/credit-cards/services/invoices'

/**
 * Próximos vencimentos e alertas de saúde financeira do dashboard.
 * Saldos (disponível/previsto) vêm de getDashboardStats; aqui ficam vencimentos,
 * faturas, reserva de emergência e uso de limite.
 */

export interface UpcomingItem {
    id: string
    kind: 'despesa' | 'receita' | 'fatura'
    descricao: string
    valor: number
    vencimento: string
    atrasado: boolean
    href: string
}

export type AlertLevel = 'critico' | 'atencao' | 'ok'

export interface HealthAlert {
    id: string
    level: AlertLevel
    titulo: string
    descricao: string
    href?: string
}

export interface DashboardAlerts {
    upcoming: UpcomingItem[]
    alerts: HealthAlert[]
    /** Meses de despesa cobertos pelos cofrinhos (null se não há histórico de despesas) */
    reserva_meses: number | null
}

const RESERVA_META_MESES = 6
const RESERVA_MINIMA_MESES = 3
const LIMITE_ALERTA = 0.8

const addDays = (iso: string, days: number) => {
    const d = parseLocalDate(iso)
    d.setDate(d.getDate() + days)
    return formatDateToISO(d)
}


interface OpenTxRow {
    id: string
    descricao: string
    valor: number | string
    data_vencimento: string
    tipo_transacao: 'receita' | 'despesa'
}

/** Puro: monta alertas a partir dos dados já carregados (testável). */
export function buildAlerts(input: {
    today: string
    openTxs: OpenTxRow[]
    cards: CardOverview[]
    cofrinhosTotal: number
    mediaDespesasMensal: number
    saldoPrevistoFimMes?: number
}): DashboardAlerts {
    const { today, openTxs, cards, cofrinhosTotal, mediaDespesasMensal } = input
    const alerts: HealthAlert[] = []

    const upcoming: UpcomingItem[] = openTxs.map(t => ({
        id: t.id,
        kind: t.tipo_transacao,
        descricao: t.descricao,
        valor: Number(t.valor),
        vencimento: t.data_vencimento,
        atrasado: t.data_vencimento < today,
        href: t.tipo_transacao === 'receita' ? '/receitas' : '/despesas'
    }))

    const limiteJanela = addDays(today, 7)
    for (const card of cards) {
        for (const inv of card.invoices) {
            if (inv.status === 'paga' || inv.em_aberto <= 0 || inv.vencimento > limiteJanela) continue
            upcoming.push({
                id: `fatura:${card.id}:${inv.key}`,
                kind: 'fatura',
                descricao: `Fatura ${card.nome}`,
                valor: inv.em_aberto,
                vencimento: inv.vencimento,
                atrasado: inv.vencimento < today,
                href: `/cartoes/${card.id}?fatura=${inv.key}`
            })
        }
    }
    upcoming.sort((a, b) => a.vencimento.localeCompare(b.vencimento))

    // Atrasos (despesas + faturas vencidas)
    const atrasados = upcoming.filter(u => u.atrasado && u.kind !== 'receita')
    if (atrasados.length > 0) {
        const total = fromCents(atrasados.reduce((acc, u) => acc + toCents(u.valor), 0))
        alerts.push({
            id: 'atrasados',
            level: 'critico',
            titulo: `${atrasados.length} conta(s) em atraso`,
            descricao: `${formatCurrency(total)} vencido(s) e não pago(s). Regularize para evitar juros.`,
            href: '/despesas'
        })
    }

    if (input.saldoPrevistoFimMes !== undefined && input.saldoPrevistoFimMes < 0) {
        alerts.push({
            id: 'saldo-previsto-negativo',
            level: 'critico',
            titulo: 'Saldo previsto negativo',
            descricao: `Com o que falta pagar e receber, o mês fecha em ${formatCurrency(input.saldoPrevistoFimMes)}.`
        })
    }

    for (const card of cards) {
        const limite = Number(card.limite || 0)
        if (limite <= 0) continue
        const uso = card.usado / limite
        if (uso >= LIMITE_ALERTA) {
            alerts.push({
                id: `limite:${card.id}`,
                level: uso >= 1 ? 'critico' : 'atencao',
                titulo: `Limite do ${card.nome} em ${Math.round(uso * 100)}%`,
                descricao: `Disponível: ${formatCurrency(card.disponivel)} de ${formatCurrency(limite)}.`,
                href: `/cartoes/${card.id}`
            })
        }
    }

    let reserva_meses: number | null = null
    if (mediaDespesasMensal > 0) {
        reserva_meses = Math.round((cofrinhosTotal / mediaDespesasMensal) * 10) / 10
        const meses = reserva_meses.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
        if (reserva_meses < RESERVA_MINIMA_MESES) {
            alerts.push({
                id: 'reserva',
                level: 'atencao',
                titulo: 'Reserva insuficiente',
                descricao: `Seus cofrinhos cobrem ${meses} mês(es) de despesas. Meta recomendada: ${RESERVA_META_MESES} meses.`,
                href: '/cofrinhos'
            })
        } else if (reserva_meses >= RESERVA_META_MESES) {
            alerts.push({
                id: 'reserva',
                level: 'ok',
                titulo: 'Reserva de emergência em dia',
                descricao: `Seus cofrinhos cobrem ${meses} meses de despesas.`
            })
        }
    }

    const order: Record<AlertLevel, number> = { critico: 0, atencao: 1, ok: 2 }
    alerts.sort((a, b) => order[a.level] - order[b.level])

    return { upcoming, alerts, reserva_meses }
}

/** Carrega dados e monta vencimentos (até 7 dias + atrasados) e alertas. */
export async function getDashboardAlerts(
    supabase: SupabaseClient,
    options: { saldoPrevistoFimMes?: number } = {}
): Promise<DashboardAlerts> {
    const today = todayISO()
    const now = parseLocalDate(today)
    // Média das despesas dos 3 últimos meses completos (competência)
    const inicioMedia = formatDateToISO(new Date(now.getFullYear(), now.getMonth() - 3, 1))
    const fimMedia = formatDateToISO(new Date(now.getFullYear(), now.getMonth(), 0))

    const [openRes, cardsOverview, cofrinhosRes, despesasRes] = await Promise.all([
        supabase
            .from('transacoes')
            .select('id, descricao, valor, data_vencimento, tipo_transacao')
            .neq('status', 'liquidado')
            .is('cartao_id', null)
            .lte('data_vencimento', addDays(today, 7))
            .order('data_vencimento', { ascending: true })
            .limit(200),
        fetchCardsOverview(supabase, today),
        supabase.from('cofrinhos').select('saldo_atual'),
        supabase
            .from('transacoes')
            .select('valor')
            .eq('tipo_transacao', 'despesa')
            .gte('data_vencimento', inicioMedia)
            .lte('data_vencimento', fimMedia)
            .limit(5000)
    ])
    if (openRes.error) throw openRes.error
    if (cofrinhosRes.error) throw cofrinhosRes.error
    if (despesasRes.error) throw despesasRes.error

    const cofrinhosTotal = fromCents((cofrinhosRes.data ?? []).reduce((acc, c) => acc + toCents(c.saldo_atual), 0))
    const totalDespesas = (despesasRes.data ?? []).reduce((acc, d) => acc + toCents(d.valor), 0)

    return buildAlerts({
        today,
        openTxs: (openRes.data ?? []) as OpenTxRow[],
        cards: cardsOverview.cards,
        cofrinhosTotal,
        mediaDespesasMensal: fromCents(Math.round(totalDespesas / 3)),
        saldoPrevistoFimMes: options.saldoPrevistoFimMes
    })
}
