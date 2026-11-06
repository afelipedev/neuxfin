"use client"

import * as React from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/features/dashboard/components/sidebar"
import { MessageSquare, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AIChatWindow } from "@/features/ai-chat/components/chat-window"
import { IntelligentCalculator } from "@/features/calculator/components/calculator"
import { TransactionProvider } from "@/features/transactions/context/transaction-context"
import { SubscriptionAutoGenerator } from "@/features/subscriptions/components/subscription-auto-generator"
import { HeaderSearch } from "@/features/dashboard/components/header-search"
import { HeaderNotifications } from "@/features/dashboard/components/header-notifications"
import { HeaderUserMenu } from "@/features/dashboard/components/header-user-menu"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isChatOpen, setIsChatOpen] = React.useState(false)
    const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false)
    const [pendingQuestion, setPendingQuestion] = React.useState<{ id: number; text: string } | null>(null)

    // Pergunta vinda da busca do cabeçalho: abre o chat e envia
    const askAI = React.useCallback((text: string) => {
        setPendingQuestion({ id: Date.now(), text })
        setIsChatOpen(true)
    }, [])
    const { theme, setTheme } = useTheme()
    const pathname = usePathname()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsCalculatorOpen(prev => !prev)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <TransactionProvider>
            <SubscriptionAutoGenerator />
            <SidebarProvider>
                <div className="flex min-h-screen w-full bg-background font-body transition-colors duration-300">
                    <DashboardSidebar />
                    <main className="flex-1 overflow-y-auto relative">
                        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/50 px-4 sm:px-6 backdrop-blur-xl justify-between">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="-ml-1 hover:text-brand-1 transition-colors" />
                                <HeaderSearch onAskAI={askAI} />
                            </div>

                            <div className="flex items-center gap-4">
                                <HeaderNotifications />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    aria-label={mounted && theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
                                    className="text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10 rounded-xl transition-all"
                                >
                                    {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </Button>
                                <HeaderUserMenu />
                            </div>
                        </header>

                        <div key={pathname} className="p-4 sm:p-6 md:p-12 max-w-[1600px] mx-auto page-transition">
                            {children}
                        </div>

                        {/* Floating AI Chat Trigger */}
                        <Button
                            size="icon"
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-[2rem] bg-brand-1 hover:bg-brand-2 text-zinc-950 shadow-2xl shadow-brand-1/20 transition-all hover:scale-110 active:scale-95 z-50 group border-none glow-primary"
                        >
                            <MessageSquare className="h-6 w-6 sm:h-6 sm:w-6 lg:h-7 lg:w-7 group-hover:rotate-12 transition-transform" />
                        </Button>

                        <AIChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} pendingQuestion={pendingQuestion} />

                        <IntelligentCalculator isOpen={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />

                        {/* Calculator Info Shortcut */}
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl glass-card text-[10px] text-muted-foreground animate-in slide-in-from-bottom-4 duration-700 shadow-2xl border-border">
                            <div className="flex items-center gap-1.5 font-black uppercase tracking-widest">
                                <kbd className="px-2 py-1 rounded bg-zinc-900/5 dark:bg-white/5 border border-border text-foreground min-w-[40px] text-center">CTRL</kbd>
                                <span className="opacity-40 text-foreground">+</span>
                                <kbd className="px-2 py-1 rounded bg-zinc-900/5 dark:bg-white/5 border border-border text-foreground min-w-[40px] text-center">K</kbd>
                            </div>
                            <div className="w-px h-3 bg-border" />
                            <span className="font-black uppercase tracking-tighter text-foreground/70">Calculadora Inteligente</span>
                        </div>
                    </main>
                </div>
            </SidebarProvider>
        </TransactionProvider>
    )
}

