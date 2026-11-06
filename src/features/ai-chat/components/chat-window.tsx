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

export function AIChatWindow({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const { messages, sendMessage, status, error } = useChat()
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
        <Card className="fixed inset-x-4 bottom-20 sm:inset-x-auto sm:bottom-24 sm:right-6 w-auto sm:w-[400px] h-[70vh] sm:h-[600px] max-h-[calc(100vh-6rem)] shadow-2xl z-50 flex flex-col border-none glass-card animate-in slide-in-from-bottom-5 duration-500 overflow-hidden rounded-[2rem]">
            <CardHeader className="bg-gradient-to-r from-brand-1 to-brand-3 text-zinc-950 py-4 sm:py-5 flex flex-row items-center justify-between border-none">
                <div className="flex items-center gap-3">
                    <div className="bg-zinc-950/10 p-2 rounded-xl">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-black tracking-tighter font-display uppercase italic text-zinc-950">Neux AI</CardTitle>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 text-zinc-950">Amigão Financeiro</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="text-zinc-950 hover:bg-zinc-950/10 h-10 w-10 rounded-xl" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-transparent">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4" ref={scrollRef}>
                    <div className="flex flex-col gap-2 max-w-[90%] animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-secondary/50 p-4 rounded-2xl rounded-tl-none border border-border shadow-sm">
                            <p className="text-sm font-medium leading-relaxed text-foreground">
                                E aí! Sou o <span className="text-brand-1 font-black">Amigão</span>.
                                Bora organizar essa grana ou vai continuar gastando em besteira?
                                O que manda hoje?
                            </p>
                        </div>
                        <span className="text-[10px] font-black uppercase text-muted-foreground/50 px-1 tracking-widest">Neux AI</span>
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
                                    ? "bg-brand-1 text-zinc-950 font-medium rounded-br-none border-brand-1/50 whitespace-pre-wrap"
                                    : "bg-secondary/50 text-foreground rounded-tl-none border-border"
                            )}>
                                {isUser ? text : <ChatMarkdown text={text} />}
                            </div>
                            <span className="text-[10px] font-black uppercase text-muted-foreground/50 px-1 tracking-widest">
                                {isUser ? 'Você' : 'Neux AI'}
                            </span>
                        </div>
                        )
                    })}

                    {loadingLabel && (
                        <div className="flex flex-col gap-2 max-w-[90%] animate-in fade-in slide-in-from-left-2 duration-300" role="status" aria-live="polite">
                            <div className="bg-secondary/50 p-4 rounded-2xl rounded-tl-none border border-border shadow-sm flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="flex gap-1" aria-hidden="true">
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-1 animate-bounce [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-1 animate-bounce [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-brand-1 animate-bounce" />
                                </span>
                                <span>{loadingLabel}</span>
                            </div>
                        </div>
                    )}

                    {errorMessage && !isLoading && (
                        <div role="alert" className="max-w-[90%] rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-400">
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
                            <p className="text-[10px] uppercase text-muted-foreground/60 font-black tracking-widest px-1">Sugestões rápidas</p>
                            <div className="grid gap-2">
                                <Button onClick={() => handleQuickAction("Qual meu saldo atual?")} variant="outline" size="sm" className="justify-start text-xs bg-background/50 border-border hover:bg-brand-1 hover:text-zinc-950 transition-all py-5 px-4 rounded-xl group text-foreground">
                                    <div className="h-2 w-2 rounded-full bg-brand-1 mr-3 group-hover:bg-zinc-950 transition-colors" />
                                    Qual meu saldo atual?
                                </Button>
                                <Button onClick={() => handleQuickAction("Analise minhas despesas recentes.")} variant="outline" size="sm" className="justify-start text-xs bg-background/50 border-border hover:bg-brand-1 hover:text-zinc-950 transition-all py-5 px-4 rounded-xl group text-foreground">
                                    <div className="h-2 w-2 rounded-full bg-brand-1 mr-3 group-hover:bg-zinc-950 transition-colors" />
                                    Analise minhas despesas
                                </Button>
                                <Button onClick={() => handleQuickAction("Quais contas vencem essa semana?")} variant="outline" size="sm" className="justify-start text-xs bg-background/50 border-border hover:bg-brand-1 hover:text-zinc-950 transition-all py-5 px-4 rounded-xl group text-foreground">
                                    <div className="h-2 w-2 rounded-full bg-brand-1 mr-3 group-hover:bg-zinc-950 transition-colors" />
                                    Contas da semana
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-4 sm:p-6 pt-0 border-none bg-transparent">
                <form onSubmit={handleSubmit} className="flex w-full items-center gap-3 bg-secondary/30 ring-1 ring-border p-2 rounded-[1.5rem] focus-within:ring-brand-1/50 transition-all">
                    <Input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Pergunte algo ao Amigão..."
                        className="flex-1 bg-transparent border-none focus-visible:ring-0 text-sm font-medium placeholder:text-muted-foreground/40 h-10 px-4 text-foreground"
                    />
                    <Button type="submit" size="icon" disabled={isLoading} className="bg-brand-1 hover:bg-brand-2 text-zinc-950 shrink-0 h-10 w-10 shadow-lg shadow-brand-1/20 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                        <Send className="h-5 w-5" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    )
}
