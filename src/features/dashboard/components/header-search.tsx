"use client"

import * as React from "react"
import { ArrowDownCircle, ArrowUpCircle, Loader2, Search, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { cn, formatCurrency, parseLocalDate } from "@/lib/utils"
import { searchTransactions, type Transaction } from "@/features/transactions/services/transactions"
import { EditTransactionDialog } from "@/features/transactions/components/edit-transaction-dialog"
import { deriveStatus, todayISO } from "@/features/bank-accounts/services/balances"

const STATUS_LABEL = { liquidado: "Pago", pendente: "Pendente", atrasado: "Atrasado" } as const

/**
 * Busca do cabeçalho: procura transações pela descrição (abre a edição ao escolher)
 * e oferece perguntar ao Amigão com o mesmo texto.
 */
export function HeaderSearch({ onAskAI }: { onAskAI: (question: string) => void }) {
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<Transaction[]>([])
    const [searching, setSearching] = React.useState(false)
    const [open, setOpen] = React.useState(false)
    const [active, setActive] = React.useState(0)
    const [editing, setEditing] = React.useState<Transaction | null>(null)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const listId = React.useId()

    const term = query.trim()
    // Itens navegáveis: resultados + "Perguntar ao Amigão"
    const itemCount = term.length >= 2 ? results.length + 1 : 0

    // Busca com debounce; resultados antigos são descartados
    React.useEffect(() => {
        if (term.length < 2) return
        let cancelled = false
        const timer = setTimeout(() => {
            setSearching(true)
            searchTransactions(term)
                .then(rows => { if (!cancelled) { setResults(rows); setActive(0) } })
                .catch(err => { console.error(err); if (!cancelled) setResults([]) })
                .finally(() => { if (!cancelled) setSearching(false) })
        }, 250)
        return () => { cancelled = true; clearTimeout(timer) }
    }, [term])

    // Fecha ao clicar fora
    React.useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("pointerdown", onPointerDown)
        return () => document.removeEventListener("pointerdown", onPointerDown)
    }, [])

    // Atalho "/" foca a busca (fora de campos de texto)
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (e.key !== "/" || target.closest("input, textarea, [contenteditable=true]")) return
            e.preventDefault()
            inputRef.current?.focus()
        }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [])

    const choose = (index: number) => {
        if (index < results.length) {
            setEditing(results[index])
        } else {
            onAskAI(term)
            setQuery("")
            setResults([])
        }
        setOpen(false)
    }

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            setOpen(false)
            inputRef.current?.blur()
            return
        }
        if (!itemCount) return
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
            setActive(i => (i + 1) % itemCount)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive(i => (i - 1 + itemCount) % itemCount)
        } else if (e.key === "Enter") {
            e.preventDefault()
            choose(open ? active : results.length)
        }
    }

    const today = todayISO()
    const showPanel = open && term.length >= 2

    return (
        <div ref={containerRef} className="relative hidden md:block">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/5 dark:bg-zinc-100/5 border border-border min-w-[320px] focus-within:border-brand-1/50 focus-within:bg-brand-1/5 transition-all group">
                <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-brand-1 transition-colors" aria-hidden="true" />
                <input
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={showPanel}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-label="Buscar transações ou perguntar ao Amigão"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Buscar transações ou perguntar à IA..."
                    className="bg-transparent border-none outline-none text-xs w-full placeholder:text-muted-foreground/50 font-medium text-foreground"
                />
                {searching
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                    : <kbd className="hidden lg:inline text-[10px] text-muted-foreground/60 border border-border rounded px-1.5">/</kbd>}
            </div>

            {showPanel && (
                <div
                    id={listId}
                    role="listbox"
                    className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden"
                >
                    {results.length === 0 && !searching && (
                        <p className="px-4 py-3 text-xs text-muted-foreground">Nenhuma transação com “{term}”.</p>
                    )}
                    {results.map((t, i) => {
                        const status = deriveStatus(t, today)
                        const Icon = t.tipo_transacao === "receita" ? ArrowUpCircle : ArrowDownCircle
                        return (
                            <button
                                key={t.id}
                                type="button"
                                role="option"
                                aria-selected={active === i}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => choose(i)}
                                className={cn(
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs transition-colors",
                                    active === i && "bg-brand-1/10"
                                )}
                            >
                                <Icon className={cn("h-4 w-4 shrink-0", t.tipo_transacao === "receita" ? "text-emerald-500" : "text-rose-500")} aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold">{t.descricao}</span>
                                    <span className="block text-[10px] text-muted-foreground">
                                        {format(parseLocalDate(t.data_vencimento), "dd/MM/yyyy")} · {t.categoria?.nome ?? "Sem categoria"} · {STATUS_LABEL[status]}
                                    </span>
                                </span>
                                <span className={cn("font-bold tabular-nums", t.tipo_transacao === "receita" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                    {t.tipo_transacao === "receita" ? "+" : "−"}{formatCurrency(t.valor)}
                                </span>
                            </button>
                        )
                    })}
                    <button
                        type="button"
                        role="option"
                        aria-selected={active === results.length}
                        onMouseEnter={() => setActive(results.length)}
                        onClick={() => choose(results.length)}
                        className={cn(
                            "flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left text-xs transition-colors",
                            active === results.length && "bg-brand-1/10"
                        )}
                    >
                        <Sparkles className="h-4 w-4 shrink-0 text-brand-1" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">
                            Perguntar ao Amigão: <span className="font-semibold">“{term}”</span>
                        </span>
                    </button>
                </div>
            )}

            {editing && (
                <EditTransactionDialog
                    key={editing.id}
                    transaction={editing}
                    open
                    onOpenChange={(next) => { if (!next) setEditing(null) }}
                />
            )}
        </div>
    )
}
