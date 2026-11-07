"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Calculator, MessageSquare, Moon, Sun } from "lucide-react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { LogoMark } from "@/components/ds"
import { DashboardSidebar } from "@/features/dashboard/components/sidebar"
import { MobileNav } from "@/features/dashboard/components/mobile-nav"
import { AIChatWindow } from "@/features/ai-chat/components/chat-window"
import { IntelligentCalculator } from "@/features/calculator/components/calculator"
import { TransactionProvider } from "@/features/transactions/context/transaction-context"
import { SubscriptionAutoGenerator } from "@/features/subscriptions/components/subscription-auto-generator"
import { HeaderSearch } from "@/features/dashboard/components/header-search"
import { HeaderNotifications } from "@/features/dashboard/components/header-notifications"
import { HeaderUserMenu } from "@/features/dashboard/components/header-user-menu"
import { cn } from "@/lib/utils"

const headerIconClass = "text-muted-foreground hover:bg-brand-1/10 hover:text-brand-1"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isChatOpen, setIsChatOpen] = React.useState(false)
    const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false)
    const [pendingQuestion, setPendingQuestion] = React.useState<{ id: number; text: string } | null>(null)
    const { resolvedTheme, setTheme } = useTheme()
    const pathname = usePathname()
    const [mounted, setMounted] = React.useState(false)

    // Pergunta vinda da busca do cabeçalho: abre o chat e envia
    const askAI = React.useCallback((text: string) => {
        setPendingQuestion({ id: Date.now(), text })
        setIsChatOpen(true)
    }, [])

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setIsCalculatorOpen(prev => !prev)
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [])

    const isDark = mounted && resolvedTheme === "dark"

    return (
        <TransactionProvider>
            <SubscriptionAutoGenerator />
            <SidebarProvider>
                <div className="flex min-h-dvh w-full bg-background">
                    <DashboardSidebar />
                    <main className="relative min-w-0 flex-1">
                        <header className="sticky top-0 z-30 border-b bg-background/80 pt-safe backdrop-blur-xl">
                            <div className="flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
                                <div className="flex min-w-0 items-center gap-1 sm:gap-3">
                                    <SidebarTrigger className={cn("hidden md:inline-flex", headerIconClass)} />
                                    <Link href="/dashboard" aria-label="NeuxFin — início" className="rounded-lg md:hidden">
                                        <LogoMark className="h-8 w-8" />
                                    </Link>
                                    <HeaderSearch onAskAI={askAI} />
                                </div>

                                <div className="flex items-center gap-0.5 sm:gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setIsCalculatorOpen(true)}
                                                aria-label="Calculadora inteligente"
                                                aria-keyshortcuts="Control+K Meta+K"
                                                className={headerIconClass}
                                            >
                                                <Calculator />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Calculadora (Ctrl/⌘ + K)</TooltipContent>
                                    </Tooltip>
                                    <HeaderNotifications />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTheme(isDark ? "light" : "dark")}
                                        aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
                                        className={cn("hidden sm:inline-flex", headerIconClass)}
                                    >
                                        {isDark ? <Sun /> : <Moon />}
                                    </Button>
                                    <HeaderUserMenu />
                                </div>
                            </div>
                        </header>

                        <div key={pathname} className="page-transition mx-auto max-w-[1600px] p-4 pb-bottom-nav sm:p-6 sm:pb-bottom-nav md:pb-10 lg:p-10">
                            {children}
                        </div>

                        {/* Chat com IA: acima da navegação inferior no mobile */}
                        {!isChatOpen && (
                            <Button
                                size="icon"
                                onClick={() => setIsChatOpen(true)}
                                aria-label="Abrir chat com o Amigão (IA)"
                                className="animate-pop fixed right-4 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-40 h-12 w-12 rounded-2xl shadow-lg md:right-6 md:bottom-6 md:h-14 md:w-14"
                            >
                                <MessageSquare className="size-6" />
                            </Button>
                        )}

                        <AIChatWindow isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} pendingQuestion={pendingQuestion} />
                        <IntelligentCalculator isOpen={isCalculatorOpen} onOpenChange={setIsCalculatorOpen} />
                    </main>
                </div>
                <MobileNav />
            </SidebarProvider>
        </TransactionProvider>
    )
}
