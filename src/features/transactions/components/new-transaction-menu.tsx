"use client"

import * as React from "react"
import { ArrowDownCircle, ArrowUpCircle, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TransactionForm } from "./transaction-form"

/** Botão "Nova transação" que pergunta se é receita ou despesa antes de abrir o formulário. */
export function NewTransactionMenu({ className }: { className?: string }) {
    const [type, setType] = React.useState<"receita" | "despesa">("despesa")
    const [open, setOpen] = React.useState(false)

    const openFor = (next: "receita" | "despesa") => {
        setType(next)
        setOpen(true)
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className={className}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Transação
                        <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => openFor("receita")}>
                        <ArrowUpCircle className="h-4 w-4 text-brand-2" />
                        Receita
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openFor("despesa")}>
                        <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                        Despesa
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {/* key: remonta o formulário ao trocar o tipo (categorias e status padrão diferem) */}
            <TransactionForm key={type} type={type} open={open} onOpenChange={setOpen} />
        </>
    )
}
