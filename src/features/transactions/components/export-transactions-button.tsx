"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { TransactionFilters } from "../services/transactions"
import { exportTransactionsXlsx } from "../services/export"

interface ExportTransactionsButtonProps {
    filters: Omit<TransactionFilters, 'page' | 'pageSize'>
    fileName: string
    label?: string
    className?: string
}

/** Exporta para XLSX todas as transações dos filtros atuais (não só a página visível). */
export function ExportTransactionsButton({ filters, fileName, label = "Exportar Planilha", className }: ExportTransactionsButtonProps) {
    const [exporting, setExporting] = React.useState(false)

    const handleClick = async () => {
        try {
            setExporting(true)
            const total = await exportTransactionsXlsx(filters, fileName)
            toast.success(total > 0 ? `${total} transação(ões) exportada(s)` : "Nenhuma transação para exportar")
        } catch (err) {
            console.error(err)
            toast.error("Erro ao exportar transações")
        } finally {
            setExporting(false)
        }
    }

    return (
        <Button variant="outline" onClick={handleClick} disabled={exporting} className={className}>
            <Download /> {exporting ? "Exportando..." : label}
        </Button>
    )
}
