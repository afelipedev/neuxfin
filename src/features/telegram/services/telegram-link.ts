import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface TelegramLinkStatus {
    vinculado: boolean
    username: string | null
    vinculado_em: string | null
}

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
        .select('telegram_username, vinculado_em')
        .maybeSingle()
    if (error) throw error
    return {
        vinculado: !!data?.vinculado_em,
        username: data?.telegram_username ?? null,
        vinculado_em: data?.vinculado_em ?? null,
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
