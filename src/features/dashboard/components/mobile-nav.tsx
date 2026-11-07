"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowDownRight, ArrowUpRight, LayoutDashboard, Menu, Plus } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { NewTransactionMenu } from "@/features/transactions/components/new-transaction-menu"
import { isNavActive } from "../nav-items"

const TABS = [
    { title: "Início", url: "/dashboard", icon: LayoutDashboard },
    { title: "Receitas", url: "/receitas", icon: ArrowUpRight },
    { title: "Despesas", url: "/despesas", icon: ArrowDownRight },
]

const tabClass =
    "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 text-2xs font-medium text-muted-foreground transition-colors active:text-foreground"

/**
 * Barra de navegação inferior (apenas < md). Fica na zona do polegar:
 * atalhos principais, botão central de novo lançamento e "Mais" (abre a sidebar).
 */
export function MobileNav() {
    const pathname = usePathname()
    const { setOpenMobile } = useSidebar()

    // Posição do indicador: 5 colunas (Início, Receitas, +, Despesas, Mais)
    const SLOT = { "/dashboard": 0, "/receitas": 1, "/despesas": 3 } as const
    const activeSlot = TABS.find(t => isNavActive(pathname, t.url))?.url
    const indicator = activeSlot ? SLOT[activeSlot as keyof typeof SLOT] : null

    const tab = (item: (typeof TABS)[number]) => {
        const active = isNavActive(pathname, item.url)
        return (
            <Link
                key={item.url}
                href={item.url}
                aria-current={active ? "page" : undefined}
                className={cn(tabClass, active && "text-brand-1")}
            >
                <item.icon
                    className={cn("h-5 w-5 transition-transform duration-300 ease-[var(--ease-spring)]", active && "-translate-y-0.5 scale-110")}
                    aria-hidden="true"
                />
                <span className="truncate">{item.title}</span>
            </Link>
        )
    }

    return (
        <nav
            aria-label="Navegação principal"
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe backdrop-blur-xl md:hidden"
        >
            <div className="relative mx-auto flex h-[var(--bottom-nav-height)] max-w-lg items-stretch px-2">
                {/* Indicador da aba ativa: desliza entre as abas */}
                <span
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none absolute top-0 left-2 h-0.5 w-[calc((100%-1rem)/5)] transition-[transform,opacity] duration-500 ease-[var(--ease-out)]",
                        indicator === null && "opacity-0"
                    )}
                    style={{ transform: `translateX(${(indicator ?? 0) * 100}%)` }}
                >
                    <span className="mx-auto block h-full w-8 rounded-full bg-brand-1" />
                </span>
                {tab(TABS[0])}
                {tab(TABS[1])}
                <div className="flex flex-1 items-center justify-center">
                    <NewTransactionMenu
                        align="center"
                        trigger={
                            <button
                                type="button"
                                aria-label="Novo lançamento"
                                className="group flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-200 active:scale-90"
                            >
                                <Plus className="h-6 w-6 transition-transform duration-300 ease-[var(--ease-spring)] group-data-[state=open]:rotate-45" aria-hidden="true" />
                            </button>
                        }
                    />
                </div>
                {tab(TABS[2])}
                <button type="button" onClick={() => setOpenMobile(true)} className={tabClass}>
                    <Menu className="h-5 w-5" aria-hidden="true" />
                    <span>Mais</span>
                </button>
            </div>
        </nav>
    )
}
