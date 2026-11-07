"use client"

import * as React from "react"
import { format } from "date-fns"
import { CheckCircle2, ExternalLink, Loader2, Send, Unlink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { IconTile, SectionCard, ToneBadge } from "@/components/ds"
import { getErrorMessage } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DEFAULT_REMINDERS,
    saveReminderPreferences,
    generateTelegramCode,
    getTelegramStatus,
    TELEGRAM_BOT_USERNAME,
    telegramDeepLink,
    unlinkTelegram,
    type TelegramLinkCode,
    type TelegramLinkStatus,
} from "../services/telegram-link"

const POLL_MS = 3000

const EXEMPLOS = [
    "gastei 35 no almoço",
    "recebi 2500 de salário no Nubank",
    "conta de luz de 180 vence dia 15",
    "qual meu saldo?",
]

/** Configurações → Telegram: vincula o bot do assistente financeiro à conta. */
export function TelegramSettings() {
    const [status, setStatus] = React.useState<TelegramLinkStatus | null>(null)
    const [code, setCode] = React.useState<TelegramLinkCode | null>(null)
    const [busy, setBusy] = React.useState(false)
    const [now, setNow] = React.useState(() => Date.now())

    React.useEffect(() => {
        const load = async () => {
            try {
                setStatus(await getTelegramStatus())
            } catch (err) {
                console.error(err)
                toast.error(getErrorMessage(err, "Erro ao carregar o vínculo do Telegram"))
                setStatus({ vinculado: false, username: null, vinculado_em: null, ...DEFAULT_REMINDERS })
            }
        }
        load()
    }, [])

    // Enquanto há código ativo, confere se o vínculo foi concluído no Telegram
    React.useEffect(() => {
        if (!code) return
        const id = setInterval(async () => {
            setNow(Date.now())
            if (Date.now() > new Date(code.expira_em).getTime()) {
                setCode(null)
                return
            }
            try {
                const next = await getTelegramStatus()
                if (next.vinculado) {
                    setStatus(next)
                    setCode(null)
                    toast.success("Telegram vinculado!")
                }
            } catch {
                // tenta de novo no próximo ciclo
            }
        }, POLL_MS)
        return () => clearInterval(id)
    }, [code])

    const handleGenerate = async () => {
        try {
            setBusy(true)
            setCode(await generateTelegramCode())
            setNow(Date.now())
        } catch (err) {
            console.error(err)
            toast.error(getErrorMessage(err, "Erro ao gerar código"))
        } finally {
            setBusy(false)
        }
    }

    const handleUnlink = async () => {
        try {
            setBusy(true)
            await unlinkTelegram()
            setStatus({ vinculado: false, username: null, vinculado_em: null, ...DEFAULT_REMINDERS })
            toast.success("Telegram desvinculado")
        } catch (err) {
            console.error(err)
            toast.error(getErrorMessage(err, "Erro ao desvincular"))
        } finally {
            setBusy(false)
        }
    }

    const handlePreferences = async (patch: Partial<Pick<TelegramLinkStatus, "lembretes_ativos" | "lembrete_hora" | "resumo_semanal">>) => {
        if (!status) return
        const next = { ...status, ...patch }
        setStatus(next)
        try {
            await saveReminderPreferences(next)
            toast.success("Preferências de lembretes salvas")
        } catch (err) {
            console.error(err)
            setStatus(status)
            toast.error(getErrorMessage(err, "Erro ao salvar preferências"))
        }
    }

    const restanteSeg = code ? Math.max(0, Math.round((new Date(code.expira_em).getTime() - now) / 1000)) : 0
    const restante = `${Math.floor(restanteSeg / 60)}:${String(restanteSeg % 60).padStart(2, "0")}`

    return (
        <div className="space-y-6">
            <SectionCard
                title="Assistente no Telegram"
                description="Registre gastos e receitas e consulte o saldo mandando mensagens ou áudios para o bot."
            >
                {!status ? (
                    <Skeleton className="h-20" />
                ) : status.vinculado ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <IconTile icon={CheckCircle2} tone="success" />
                            <div>
                                <p className="flex items-center gap-2 text-sm font-medium">
                                    Vinculado {status.username ? `como @${status.username}` : ""}
                                    <ToneBadge tone="success">Ativo</ToneBadge>
                                </p>
                                {status.vinculado_em && (
                                    <p className="text-xs text-muted-foreground">Desde {format(new Date(status.vinculado_em), "dd/MM/yyyy 'às' HH:mm")}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 [&>*]:w-full sm:[&>*]:w-auto">
                            {TELEGRAM_BOT_USERNAME && (
                                <Button asChild variant="outline">
                                    <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}`} target="_blank" rel="noopener noreferrer">
                                        <Send className="h-4 w-4" />
                                        Abrir conversa
                                    </a>
                                </Button>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" disabled={busy}>
                                        <Unlink className="h-4 w-4" />
                                        Desvincular
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Desvincular o Telegram?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            O bot deixa de responder a este Telegram. Os lançamentos já feitos continuam no app.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleUnlink}>Desvincular</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ) : !TELEGRAM_BOT_USERNAME ? (
                    <p className="text-sm text-muted-foreground">
                        O bot ainda não foi configurado neste ambiente (falta <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>).
                    </p>
                ) : code ? (
                    <div className="space-y-4">
                        <ol className="list-decimal space-y-1 pl-5 text-sm">
                            <li>Toque em <strong>Abrir no Telegram</strong> e depois em <strong>Iniciar</strong>.</li>
                            <li>Esta tela confirma sozinha quando o vínculo for concluído.</li>
                        </ol>
                        <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="eyebrow">Código</p>
                                <p className="font-mono text-xl font-bold tracking-widest">{code.codigo}</p>
                                <p className="text-xs text-muted-foreground">Expira em {restante} · ou envie <span className="font-mono">/start {code.codigo}</span> ao @{TELEGRAM_BOT_USERNAME}</p>
                            </div>
                            <Button asChild>
                                <a href={telegramDeepLink(code.codigo)} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                    Abrir no Telegram
                                </a>
                            </Button>
                        </div>
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando confirmação…
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <IconTile icon={Send} tone="info" />
                            <p className="text-sm text-muted-foreground">Nenhum Telegram vinculado. O bot é @{TELEGRAM_BOT_USERNAME}.</p>
                        </div>
                        <Button onClick={handleGenerate} disabled={busy}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Vincular Telegram
                        </Button>
                    </div>
                )}
            </SectionCard>

            {status?.vinculado && (
                <SectionCard
                    title="Lembretes no Telegram"
                    description="Uma mensagem por dia, só quando houver algo: contas vencendo ou atrasadas, faturas, assinaturas no cartão e orçamentos."
                >
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 text-sm">
                            <Checkbox
                                checked={status.lembretes_ativos}
                                onCheckedChange={v => handlePreferences({ lembretes_ativos: v === true })}
                            />
                            Enviar lembretes diários
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                            <Label htmlFor="lembrete-hora" className="text-sm font-normal">Horário (Brasília)</Label>
                            <Select
                                value={String(status.lembrete_hora)}
                                onValueChange={v => handlePreferences({ lembrete_hora: Number(v) })}
                                disabled={!status.lembretes_ativos}
                            >
                                <SelectTrigger id="lembrete-hora" className="w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 17 }, (_, i) => i + 6).map(h => (
                                        <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <label className="flex items-center gap-3 text-sm">
                            <Checkbox
                                checked={status.resumo_semanal}
                                disabled={!status.lembretes_ativos}
                                onCheckedChange={v => handlePreferences({ resumo_semanal: v === true })}
                            />
                            Resumo da semana às segundas-feiras
                        </label>
                        <p className="text-xs text-muted-foreground">Também dá para pausar pelo bot com /lembretes off.</p>
                    </div>
                </SectionCard>
            )}

            <SectionCard title="O que mandar para o bot" description="Texto ou áudio de até 2 minutos. Sem conta citada, usa a conta padrão.">
                <ul className="flex flex-wrap gap-2">
                    {EXEMPLOS.map(e => (
                        <li key={e} className="rounded-full bg-muted px-3 py-1 text-xs">“{e}”</li>
                    ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">Comandos: /saldo, /ajuda e /desvincular. Usa o modelo de chat de Configurações → IA.</p>
            </SectionCard>
        </div>
    )
}
