"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

interface DataTablePaginationProps {
    page: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
    /** Quando informado, exibe o seletor de itens por página. */
    onPageSizeChange?: (pageSize: number) => void
    pageSizeOptions?: number[]
    /** Quantidade máxima de botões numerados visíveis. */
    maxPageButtons?: number
    className?: string
}

/**
 * Rodapé de paginação padrão para tabelas e listas.
 * Funciona tanto com paginação no servidor (totalCount vindo do Supabase)
 * quanto no client (ver `usePaginatedList`).
 */
export function DataTablePagination({
    page,
    pageSize,
    totalCount,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
    maxPageButtons = 5,
    className,
}: DataTablePaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, totalCount)

    const pages = React.useMemo(() => {
        const first = Math.max(1, Math.min(page - Math.floor(maxPageButtons / 2), totalPages - maxPageButtons + 1))
        const last = Math.min(totalPages, first + maxPageButtons - 1)
        return Array.from({ length: last - first + 1 }, (_, i) => first + i)
    }, [page, totalPages, maxPageButtons])

    if (totalCount === 0) return null

    const go = (target: number) => onPageChange(Math.min(Math.max(1, target), totalPages))
    const navButton = "h-8 w-8 rounded-lg"

    return (
        <nav
            aria-label="Paginação"
            className={cn(
                "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border",
                className
            )}
        >
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="tabular-nums">
                    Mostrando <span className="font-semibold text-foreground">{start}</span>–
                    <span className="font-semibold text-foreground">{end}</span> de{" "}
                    <span className="font-semibold text-foreground">{totalCount}</span>
                </span>
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:inline">Por página</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(v) => onPageSizeChange(Number(v))}
                        >
                            <SelectTrigger className="h-8 w-[70px] text-xs" aria-label="Itens por página">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizeOptions.map(size => (
                                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className={cn(navButton, "hidden sm:inline-flex")} onClick={() => go(1)} disabled={page === 1} aria-label="Primeira página">
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className={navButton} onClick={() => go(page - 1)} disabled={page === 1} aria-label="Página anterior">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {pages.map(p => (
                        <Button
                            key={p}
                            variant={p === page ? "default" : "outline"}
                            size="icon"
                            onClick={() => go(p)}
                            aria-label={`Página ${p}`}
                            aria-current={p === page ? "page" : undefined}
                            className={cn(
                                navButton,
                                "text-xs font-bold tabular-nums",
                                p === page && "bg-brand-1 text-zinc-950 hover:bg-brand-2 border-brand-1"
                            )}
                        >
                            {p}
                        </Button>
                    ))}
                    <Button variant="outline" size="icon" className={navButton} onClick={() => go(page + 1)} disabled={page === totalPages} aria-label="Próxima página">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className={cn(navButton, "hidden sm:inline-flex")} onClick={() => go(totalPages)} disabled={page === totalPages} aria-label="Última página">
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </nav>
    )
}

/**
 * Paginação no client para listas já carregadas em memória.
 * Volta para a página 1 quando `resetKey` muda (ex.: filtros) e
 * corrige a página se a lista encolher (ex.: após excluir itens).
 */
export function usePaginatedList<T>(items: T[], initialPageSize = 10, resetKey?: unknown) {
    const [page, setPage] = React.useState(1)
    const [pageSize, setPageSizeState] = React.useState(initialPageSize)
    const [lastResetKey, setLastResetKey] = React.useState(resetKey)

    // Ajuste de estado durante o render (padrão recomendado pelo React em vez de useEffect)
    if (resetKey !== lastResetKey) {
        setLastResetKey(resetKey)
        setPage(1)
    }

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    const pageItems = React.useMemo(
        () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [items, currentPage, pageSize]
    )

    const setPageSize = (size: number) => {
        setPageSizeState(size)
        setPage(1)
    }

    return {
        page: currentPage,
        pageSize,
        totalCount: items.length,
        pageItems,
        setPage,
        setPageSize,
    }
}
