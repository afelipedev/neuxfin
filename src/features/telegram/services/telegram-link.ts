import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface TelegramLinkStatus {
    vinculado: boolean
    username: string | null
    vinculado_em: string | null
    lembretes_ativos: boolean
    lembrete_hora: number
    resumo_semanal: boolean
}

export const DEFAULT_REMINDERS = { lembretes_ativos: true, lembrete_hora: 8, resumo_semanal: true }

export interface TelegramLinkCode {
    codigo: string
    expira_em: string
}

/** Usuário do bot configurado (público). Sem ele o vínculo por link não funciona. */
export const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ''

export const telegramDeepLink = (codigo: string) =>
    `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(codigo)}`

/** O usuário só lê colunas não sensíveis (sem chat_id nem hash do código). */
export async function getTelegramStatus(): Promise<TelegramLinkStatus> {
    const { data, error } = await supabase
        .from('telegram_vinculos')
        .select('telegram_username, vinculado_em, lembretes_ativos, lembrete_hora, resumo_semanal')
        .maybeSingle()
    if (error) throw error
    return {
        vinculado: !!data?.vinculado_em,
        username: data?.telegram_username ?? null,
        vinculado_em: data?.vinculado_em ?? null,
        lembretes_ativos: data?.lembretes_ativos ?? DEFAULT_REMINDERS.lembretes_ativos,
        lembrete_hora: data?.lembrete_hora ?? DEFAULT_REMINDERS.lembrete_hora,
        resumo_semanal: data?.resumo_semanal ?? DEFAULT_REMINDERS.resumo_semanal,
    }
}

/** Gera um código de uso único (10 min). Substitui o anterior. */
export async function generateTelegramCode(): Promise<TelegramLinkCode> {
    const { data, error } = await supabase.rpc('gerar_codigo_telegram')
    if (error) throw error
    const row = (data as TelegramLinkCode[] | null)?.[0]
    if (!row) throw new Error('Não foi possível gerar o código')
    return row
}

export async function unlinkTelegram() {
    const { error } = await supabase.rpc('desvincular_telegram')
    if (error) throw error
}

export async function saveReminderPreferences(p: { lembretes_ativos: boolean; lembrete_hora: number; resumo_semanal: boolean }) {
    const { error } = await supabase.rpc('salvar_preferencias_telegram', {
        p_ativos: p.lembretes_ativos,
        p_hora: p.lembrete_hora,
        p_resumo: p.resumo_semanal,
    })
    if (error) throw error
}
