import { formatCurrency, formatDateToISO, parseLocalDate } from '@/lib/utils'

/**
 * Lembretes proativos (puro, testável). Recebe os dados já carregados do usuário e devolve
 * os itens com uma chave de deduplicação: a rota só envia o que ainda não foi enviado
 * (tabela telegram_lembretes_enviados) e monta uma única mensagem.
 */

export interface ReminderTx {
    id: string
    descricao: string
    valor: number | string
    tipo_transacao: 'receita' | 'despesa'
    data_vencimento: string
}

export interface ReminderInvoice {
    cartao_id: string
    cartao: string
    key: string
    vencimento: string
    em_aberto: number
}

export interface ReminderBudget {
    id: string
    categoria: string
    percentual: number
    gasto: number
    limite: number
    status: 'ok' | 'atencao' | 'estourado'
}

export interface ReminderSubscription {
    id: string
    nome: string
    valor: number | string
    cobranca: string
    onde: string
}

export interface WeeklySummary {
    despesas: number
    receitas: number
    top_categorias: Array<{ categoria: string; valor: number }>
    saldo_disponivel: number
    saldo_previsto_fim_do_mes: number
}

export interface ReminderInput {
    today: string
    /** Lançamentos em aberto (sem cartão e sem assinatura), vencidos ou até amanhã */
    openTxs: ReminderTx[]
    invoices: ReminderInvoice[]
    budgets: ReminderBudget[]
    subscriptions: ReminderSubscription[]
    /** Só às segundas-feiras com resumo_semanal ligado */
    weekly?: WeeklySummary | null
}

export type ReminderSection = 'atrasadas' | 'hoje' | 'amanha' | 'receber' | 'faturas' | 'assinaturas' | 'orcamentos' | 'resumo'

export interface ReminderItem {
    key: string
    section: ReminderSection
    text: string
}

const FATURA_JANELA_DIAS = 3
/** Atrasos mais antigos que isso viram uma linha de resumo semanal (não item a item). */
const ATRASO_RECENTE_DIAS = 7

const addDays = (iso: string, days: number) => {
    const d = parseLocalDate(iso)
    d.setDate(d.getDate() + days)
    return formatDateToISO(d)
}
const br = (iso: string) => iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/')
const money = (v: number | string) => formatCurrency(Number(v))

/** Segunda-feira da semana de `iso` (chave do resumo semanal). */
export function weekStart(iso: string): string {
    const d = parseLocalDate(iso)
    const offset = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - offset)
    return formatDateToISO(d)
}

export function buildReminders(input: ReminderInput): ReminderItem[] {
    const { today } = input
    const amanha = addDays(today, 1)
    const limiteAtrasoRecente = addDays(today, -ATRASO_RECENTE_DIAS)
    const items: ReminderItem[] = []
    let antigosQtd = 0
    let antigosCents = 0

    for (const t of input.openTxs) {
        const venc = t.data_vencimento.slice(0, 10)
        if (t.tipo_transacao === 'receita') {
            if (venc === today) items.push({ key: `receber:${t.id}:${venc}`, section: 'receber', text: `${t.descricao}: ${money(t.valor)}` })
            continue
        }
        if (venc < limiteAtrasoRecente) {
            antigosQtd++
            antigosCents += Math.round(Number(t.valor) * 100)
        } else if (venc < today) {
            items.push({ key: `atraso:${t.id}`, section: 'atrasadas', text: `${t.descricao}: ${money(t.valor)} (venceu ${br(venc)})` })
        } else if (venc === today) {
            items.push({ key: `hoje:${t.id}:${venc}`, section: 'hoje', text: `${t.descricao}: ${money(t.valor)}` })
        } else if (venc === amanha) {
            items.push({ key: `amanha:${t.id}:${venc}`, section: 'amanha', text: `${t.descricao}: ${money(t.valor)}` })
        }
    }

    if (antigosQtd > 0) {
        items.push({
            key: `atrasos-antigos:${weekStart(today)}`,
            section: 'atrasadas',
            text: `${antigosQtd} ${antigosQtd === 1 ? 'conta em atraso' : 'contas em atraso'} há mais de ${ATRASO_RECENTE_DIAS} dias, total ${money(antigosCents / 100)}. Se já pagou, me diga ("paguei a luz") ou marque no app.`,
        })
    }

    const limiteFatura = addDays(today, FATURA_JANELA_DIAS)
    for (const f of input.invoices) {
        if (f.em_aberto <= 0 || f.vencimento > limiteFatura) continue
        const quando = f.vencimento < today ? `venceu ${br(f.vencimento)}` : f.vencimento === today ? 'vence hoje' : `vence ${br(f.vencimento)}`
        items.push({ key: `fatura:${f.cartao_id}:${f.key}:${f.vencimento < today ? 'vencida' : 'avencer'}`, section: 'faturas', text: `${f.cartao}: ${money(f.em_aberto)} (${quando})` })
    }

    for (const s of input.subscriptions) {
        if (s.cobranca !== amanha) continue
        items.push({ key: `assinatura:${s.id}:${s.cobranca}`, section: 'assinaturas', text: `${s.nome}: ${money(s.valor)} amanhã (${s.onde})` })
    }

    const mes = today.slice(0, 7)
    for (const b of input.budgets) {
        if (b.status === 'ok') continue
        items.push({
            key: `orcamento:${b.id}:${mes}:${b.status}`,
            section: 'orcamentos',
            text: b.status === 'estourado'
                ? `${b.categoria}: estourado (${money(b.gasto)} de ${money(b.limite)})`
                : `${b.categoria}: ${b.percentual}% usado (${money(b.gasto)} de ${money(b.limite)})`,
        })
    }

    if (input.weekly) {
        const w = input.weekly
        const top = w.top_categorias.slice(0, 3).map(c => `${c.categoria} ${money(c.valor)}`).join(', ')
        items.push({
            key: `resumo:${weekStart(today)}`,
            section: 'resumo',
            text: [
                `Últimos 7 dias: despesas ${money(w.despesas)} · receitas ${money(w.receitas)}`,
                top ? `Onde mais gastou: ${top}` : null,
                `Saldo hoje ${money(w.saldo_disponivel)} · previsto no fim do mês ${money(w.saldo_previsto_fim_do_mes)}`,
            ].filter(Boolean).join('\n'),
        })
    }

    return items
}

const SECTION_TITLE: Record<ReminderSection, string> = {
    atrasadas: '🔴 Em atraso',
    hoje: '📌 Vencem hoje',
    amanha: '⏰ Vencem amanhã',
    receber: '💰 Para receber hoje',
    faturas: '💳 Faturas',
    assinaturas: '🔁 Assinaturas',
    orcamentos: '🎯 Orçamentos',
    resumo: '📊 Resumo da semana',
}

const ORDER: ReminderSection[] = ['atrasadas', 'hoje', 'amanha', 'receber', 'faturas', 'assinaturas', 'orcamentos', 'resumo']

/** Mensagem única do dia (texto puro do Telegram). Vazia quando não há nada a avisar. */
export function formatReminderMessage(items: ReminderItem[]): string {
    if (items.length === 0) return ''
    const blocks = ORDER
        .map(section => {
            const list = items.filter(i => i.section === section)
            if (list.length === 0) return null
            const body = section === 'resumo' ? list.map(i => i.text).join('\n') : list.map(i => `• ${i.text}`).join('\n')
            return `${SECTION_TITLE[section]}\n${body}`
        })
        .filter(Boolean)
    return ['Bom dia! Seus lembretes do NeuxFin:', ...blocks, 'Responda aqui se quiser que eu pague ou registre algo. /lembretes off para pausar.'].join('\n\n')
}
