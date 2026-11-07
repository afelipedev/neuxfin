import { experimental_transcribe as transcribe } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUserScopedClient } from '@/lib/supabase/user-token'
import { describeAIError, resolveTranscriptionModel } from '@/features/ai-models/server/resolve-model'
import { getBalanceCore } from '@/features/ai-chat/tools/finance-tools'
import { clearHistory, runFinanceAgent } from './agent'
import { downloadFile, sendMessage, sendTyping } from './telegram-api'
import {
    formatBalanceMessage,
    HELP_MESSAGE,
    MAX_AUDIO_SECONDS,
    MAX_TEXT_LENGTH,
    NOT_LINKED_MESSAGE,
    parseUpdate,
    type TelegramUpdate,
} from './parse'

type Admin = ReturnType<typeof createAdminClient>

async function findUserByChat(admin: Admin, chatId: number): Promise<string | null> {
    const { data, error } = await admin
        .from('telegram_vinculos')
        .select('usuario_id')
        .eq('chat_id', chatId)
        .maybeSingle()
    if (error) throw error
    return (data?.usuario_id as string | undefined) ?? null
}

async function handleCommand(admin: Admin, chatId: number, command: string, arg: string, username: string | null) {
    if (command === 'start' && arg) {
        const { data: userId, error } = await admin.rpc('vincular_telegram', {
            p_codigo: arg,
            p_chat_id: chatId,
            p_username: username ?? '',
        })
        if (error) throw error
        if (!userId) {
            await sendMessage(chatId, 'Esse código é inválido ou expirou (vale por 10 minutos). Gere um novo em Configurações → Telegram no app.')
            return
        }
        await sendMessage(chatId, `Pronto, Telegram vinculado ao NeuxFin! ✅\n\n${HELP_MESSAGE}`)
        return
    }

    const userId = await findUserByChat(admin, chatId)
    if (!userId) {
        await sendMessage(chatId, NOT_LINKED_MESSAGE)
        return
    }

    switch (command) {
        case 'start':
        case 'ajuda':
        case 'help':
            await sendMessage(chatId, HELP_MESSAGE)
            return
        case 'saldo': {
            await sendTyping(chatId)
            const balance = await getBalanceCore(createUserScopedClient(userId), null, null, userId)
            await sendMessage(chatId, formatBalanceMessage(balance))
            return
        }
        case 'lembretes': {
            const arg2 = arg.toLowerCase()
            if (arg2 === 'on' || arg2 === 'off') {
                const { error } = await admin
                    .from('telegram_vinculos')
                    .update({ lembretes_ativos: arg2 === 'on' })
                    .eq('usuario_id', userId)
                    .eq('chat_id', chatId)
                if (error) throw error
            }
            const { data: pref, error } = await admin
                .from('telegram_vinculos')
                .select('lembretes_ativos, lembrete_hora, resumo_semanal')
                .eq('usuario_id', userId)
                .single()
            if (error) throw error
            await sendMessage(chatId, pref.lembretes_ativos
                ? `🔔 Lembretes ligados, todo dia às ${pref.lembrete_hora}h (horário de Brasília)${pref.resumo_semanal ? ', com resumo semanal às segundas' : ''}.\n\nPara pausar: /lembretes off. Horário e resumo em Configurações → Telegram.`
                : '🔕 Lembretes pausados. Para ligar: /lembretes on.')
            return
        }
        case 'desvincular': {
            const { error } = await admin
                .from('telegram_vinculos')
                .update({ chat_id: null, telegram_username: null, vinculado_em: null })
                .eq('usuario_id', userId)
                .eq('chat_id', chatId)
            if (error) throw error
            await clearHistory(admin, userId)
            await sendMessage(chatId, 'Telegram desvinculado. Para usar de novo, vincule em Configurações → Telegram. 👋')
            return
        }
        default:
            await sendMessage(chatId, `Não conheço esse comando.\n\n${HELP_MESSAGE}`)
    }
}

async function transcribeVoice(userId: string, fileId: string): Promise<string | null> {
    const model = await resolveTranscriptionModel(userId)
    if (!model) return null
    const audio = await downloadFile(fileId)
    const result = await transcribe({
        model,
        audio,
        providerOptions: { groq: { language: 'pt' }, openai: { language: 'pt' } },
    })
    return result.text.trim()
}

/**
 * Processa um update do Telegram (chamado depois de responder 200 ao webhook).
 * Service role só para o vínculo (quem é o dono do chat) e o histórico; dados financeiros
 * sempre com o client do usuário (RLS).
 */
export async function handleUpdate(update: TelegramUpdate): Promise<void> {
    const parsed = parseUpdate(update)
    if (parsed.kind === 'ignore') return

    const chatId = parsed.chatId
    const admin = createAdminClient()

    try {
        switch (parsed.kind) {
            case 'command':
                await handleCommand(admin, chatId, parsed.command, parsed.arg, parsed.username)
                return
            case 'too_long':
                await sendMessage(chatId, parsed.what === 'audio'
                    ? `Áudio muito longo. Mande até ${MAX_AUDIO_SECONDS / 60} minutos, por favor.`
                    : `Mensagem muito longa (máximo de ${MAX_TEXT_LENGTH} caracteres).`)
                return
            case 'unsupported':
                await sendMessage(chatId, 'Por enquanto eu entendo texto e áudio. 🙂')
                return
        }

        const userId = await findUserByChat(admin, chatId)
        if (!userId) {
            await sendMessage(chatId, NOT_LINKED_MESSAGE)
            return
        }

        let text: string
        if (parsed.kind === 'voice') {
            await sendTyping(chatId)
            const transcript = await transcribeVoice(userId, parsed.fileId)
            if (transcript === null) {
                await sendMessage(chatId, 'Não consigo ouvir áudios sem um modelo Groq ou OpenAI configurado em Configurações → IA. Mande em texto, por favor.')
                return
            }
            if (!transcript) {
                await sendMessage(chatId, 'Não entendi o áudio. Pode repetir ou mandar em texto?')
                return
            }
            await sendMessage(chatId, `🎙️ "${transcript}"`)
            text = transcript
        } else {
            text = parsed.text
        }

        await sendTyping(chatId)
        const reply = await runFinanceAgent(admin, userId, chatId, text)
        await sendMessage(chatId, reply)
    } catch (error) {
        console.error('[telegram] erro ao processar update', update.update_id, error)
        await sendMessage(chatId, `⚠️ ${describeAIError(error).message}`).catch(() => undefined)
    }
}
