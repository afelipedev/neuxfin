"use client"

import * as React from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/features/dashboard/components/sidebar"
import { Calculator, MessageSquare, Search, Bell, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AIChatWindow } from "@/features/ai-chat/components/chat-window"
import { IntelligentCalculator } from "@/features/calculator/components/calculator"
import { TransactionProvider } from "@/features/transactions/context/transaction-context"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isChatOpen, setIsChatOpen] = React.useState(false)
    const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false)
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
            <SidebarProvider>
                <div className="flex min-h-screen w-full bg-background font-body transition-colors duration-300">
                    <DashboardSidebar />
                    <main className="flex-1 overflow-y-auto relative">
                        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/50 px-4 sm:px-6 backdrop-blur-xl justify-between">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="-ml-1 hover:text-brand-1 transition-colors" />
                                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/5 dark:bg-zinc-100/5 border border-border min-w-[320px] focus-within:border-brand-1/50 focus-within:bg-brand-1/5 transition-all group">
                                    <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-brand-1 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Consultar transações, documentos ou IA..."
                                        className="bg-transparent border-none outline-none text-xs w-full placeholder:text-muted-foreground/50 font-medium text-foreground"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10 rounded-xl transition-all">
                                    <Bell className="h-5 w-5" />
                                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-brand-1 border-2 border-background animate-pulse" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="text-muted-foreground hover:text-brand-1 hover:bg-brand-1/10 rounded-xl transition-all"
                                >
                                    {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                                </Button>
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-1 to-brand-3 flex items-center justify-center text-zinc-950 text-xs font-black border border-white/10 shadow-lg shadow-brand-1/10 cursor-pointer hover:scale-105 transition-transform font-display">
                                    AF
                                </div>
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

                        <AIChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

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

