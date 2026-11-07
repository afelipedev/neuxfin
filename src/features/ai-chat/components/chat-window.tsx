"use client"

import * as React from "react"
import Link from "next/link"
import { ChatMarkdown } from "./chat-markdown"
import { Send, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useChat } from '@ai-sdk/react'
import { cn } from "@/lib/utils"

interface AIChatWindowProps {
    isOpen: boolean
    onClose: () => void
    /** Pergunta enviada de fora (ex.: busca do cabeçalho); `id` muda a cada envio */
    pendingQuestion?: { id: number; text: string } | null
}

export function AIChatWindow({ isOpen, onClose, pendingQuestion }: AIChatWindowProps) {
    const { messages, sendMessage, status, error } = useChat()

    // Envia uma vez cada pergunta vinda de fora
    const sentQuestionId = React.useRef<number | null>(null)
    React.useEffect(() => {
        if (!pendingQuestion || sentQuestionId.current === pendingQuestion.id) return
        sentQuestionId.current = pendingQuestion.id
        sendMessage({ text: pendingQuestion.text })
    }, [pendingQuestion, sendMessage])
    // A rota responde {"error": "..."}; o transport repassa o corpo como mensagem
    const errorMessage = React.useMemo(() => {
        if (!error) return null
        try {
            return (JSON.parse(error.message) as { error?: string }).error ?? error.message
        } catch {
            return error.message || 'Não foi possível falar com o Amigão agora.'
        }
    }, [error])
    const [input, setInput] = React.useState('')
    const isLoading = status === 'submitted' || status === 'streaming'

    // Texto do indicador: some quando a resposta começa a aparecer
    const loadingLabel = React.useMemo(() => {
        if (!isLoading) return null
        const last = messages[messages.length - 1]
        if (last?.role !== 'assistant') return 'Amigão está pensando...'
        const hasText = last.parts.some(p => p.type === 'text' && p.text.trim().length > 0)
        if (hasText) return null
        const usingTool = last.parts.some(p => p.type.startsWith('tool-'))
        return usingTool ? 'Consultando suas finanças...' : 'Amigão está pensando...'
    }, [isLoading, messages])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return
        sendMessage({ text: input })
        setInput('')
    }
    const scrollRef = React.useRef<HTMLDivElement>(null)

    // Scroll to bottom whenever messages change
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleQuickAction = (text: string) => {
        sendMessage({ text })
    }

    if (!isOpen) return null

    return (
        <Card
            role="dialog"
            aria-label="Chat com o Amigão"
            className="fixed inset-0 z-50 flex h-dvh flex-col gap-0 overflow-hidden rounded-none border-0 py-0 shadow-2xl animate-in slide-in-from-bottom-5 duration-300 md:inset-auto md:right-6 md:bottom-6 md:h-[min(640px,calc(100dvh-3rem))] md:w-[400px] md:rounded-2xl md:border"
        >
            <CardHeader className="flex flex-row items-center justify-between gap-3 bg-primary px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-primary-foreground md:pt-3">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary-foreground/10 p-2">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="font-display text-base font-bold">Neux AI</CardTitle>
                        <p className="text-xs opacity-75">Amigão Financeiro</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Fechar chat" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-transparent">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" ref={scrollRef}>
                    <div className="flex flex-col gap-2 max-w-[90%] animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-secondary/50 p-4 rounded-2xl rounded-tl-none border border-border shadow-sm">
                            <p className="text-sm font-medium leading-relaxed text-foreground">
                                E aí! Sou o <span className="font-bold text-brand-1">Amigão</span>.
                                Bora organizar essa grana ou vai continuar gastando em besteira?
                                O que manda hoje?
                            </p>
                        </div>
                        <span className="eyebrow px-1">Neux AI</span>
                    </div>

                    {messages.map((m) => {
                        // Junta as partes de texto (entre chamadas de ferramenta vêm em várias partes)
                        const text = m.parts
                            .map(part => (part.type === 'text' ? part.text : ''))
                            .filter(Boolean)
                            .join('\n\n')
                            .trim()
                        // Enquanto o modelo só consulta ferramentas, não mostra balão vazio
                        if (!text) return null
                        const isUser = m.role === 'user'
                        return (
                        <div key={m.id} className={cn(
                            "flex flex-col gap-2 max-w-[90%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                            isUser ? "ml-auto items-end" : "mr-auto items-start"
                        )}>
                            <div className={cn(
                                "p-4 rounded-2xl border shadow-sm text-sm leading-relaxed",
                                isUser
                                    ? "bg-primary text-primary-foreground rounded-br-none border-primary whitespace-pre-wrap"
                                    : "bg-secondary/50 text-foreground rounded-tl-none border-border"
                            )}>
                                {isUser ? text : <ChatMarkdown text={text} />}
                            </div>
                            <span className="eyebrow px-1">
                                {isUser ? 'Você' : 'Neux AI'}
                            </span>
                        </div>
                        )
                    })}

                    {loadingLabel && (
                        <div className="flex flex-col gap-2 max-w-[90%] animate-in fade-in slide-in-from-left-2 duration-300" role="status" aria-live="polite">
                            <div className="bg-secondary/50 p-4 rounded-2xl rounded-tl-none border border-border shadow-sm flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="flex gap-1" aria-hidden="true">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                                </span>
                                <span>{loadingLabel}</span>
                            </div>
                        </div>
                    )}

                    {errorMessage && !isLoading && (
                        <div role="alert" className="max-w-[90%] rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            {errorMessage}
                            {errorMessage.includes('Configurações') && (
                                <Link href="/configuracoes?tab=ia" onClick={onClose} className="mt-2 block font-semibold underline">
                                    Abrir Configurações → IA
                                </Link>
                            )}
                        </div>
                    )}

                    {messages.length === 0 && (
                        <div className="space-y-3 pt-4">
                            <p className="eyebrow px-1">Sugestões rápidas</p>
                            <div className="grid gap-2">
                                <Button onClick={() => handleQuickAction("Qual meu saldo atual?")} variant="outline" size="sm" className="h-11 justify-start rounded-xl px-4 text-sm">
                                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                                    Qual meu saldo atual?
                                </Button>
                                <Button onClick={() => handleQuickAction("Analise minhas despesas recentes.")} variant="outline" size="sm" className="h-11 justify-start rounded-xl px-4 text-sm">
                                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                                    Analise minhas despesas
                                </Button>
                                <Button onClick={() => handleQuickAction("Quais contas vencem essa semana?")} variant="outline" size="sm" className="h-11 justify-start rounded-xl px-4 text-sm">
                                    <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                                    Contas da semana
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="border-t px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:pb-3">
                <form onSubmit={handleSubmit} className="flex w-full items-center gap-2 rounded-xl bg-muted/60 p-1.5 ring-1 ring-border transition-shadow focus-within:ring-ring">
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Pergunte algo ao Amigão..."
                        aria-label="Mensagem para o Amigão"
                        enterKeyHint="send"
                        className="h-10 flex-1 border-none bg-transparent px-3 shadow-none focus-visible:ring-0"
                    />
                    <Button type="submit" size="icon" disabled={isLoading} aria-label="Enviar" className="shrink-0 rounded-lg">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    )
}
