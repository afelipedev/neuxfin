"use client"

import { useState, useEffect } from "react"
import { Calculator, TrendingUp, TrendingDown, Wallet, CheckCircle2, Search, Filter } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IconTile } from "@/components/ds"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn, parseLocalDate, formatCurrency } from "@/lib/utils"
import { useTransactions, useDashboardStats } from "@/features/transactions/hooks/use-transactions"

interface CalculatorProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function IntelligentCalculator({ isOpen, onOpenChange }: CalculatorProps) {
    const currentDate = new Date()
    const [display, setDisplay] = useState("0")
    const [activeTab, setActiveTab] = useState("quick")

    // Filtros para o seletor de dados
    const [filterType, setFilterType] = useState<"receita" | "despesa">("despesa")
    const [filterMonth, setFilterMonth] = useState<number>(currentDate.getMonth() + 1)
    const [filterYear, setFilterYear] = useState<number>(currentDate.getFullYear())
    const [filterCategory, setFilterCategory] = useState<string>("all")
    const [filterStatus, setFilterStatus] = useState<"todos" | "liquidado" | "pendente" | "atrasado">("todos")
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

    // Dados do mês atual
    const { stats } = useDashboardStats({
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear()
    })

    // Transações do seletor (filtrar no backend para não "sumir" itens por paginação)
    const { transactions } = useTransactions({
        month: filterMonth,
        year: filterYear,
        tipo_transacao: filterType,
        categoria_id: filterCategory !== "all" ? filterCategory : undefined,
        status: filterStatus !== "todos" ? filterStatus : undefined,
        pageSize: 200,
    })

    // Calcular receitas e despesas liquidadas
    const receitasRecebidas = transactions
        .filter(t => t.tipo_transacao === 'receita' && t.status === 'liquidado')
        .reduce((sum, t) => sum + Number(t.valor), 0)

    const despesasPagas = transactions
        .filter(t => t.tipo_transacao === 'despesa' && t.status === 'liquidado')
        .reduce((sum, t) => sum + Number(t.valor), 0)

    // Filtrar transações
    const filteredTransactions = transactions.filter(t => {
        if (searchTerm && !t.descricao.toLowerCase().includes(searchTerm.toLowerCase())) return false
        return true
    })

    // Calcular totais
    const totalFiltered = filteredTransactions.reduce((sum, t) => sum + Number(t.valor), 0)
    const totalSelected = Array.from(selectedItems)
        .map(id => filteredTransactions.find(t => t.id === id))
        .filter(Boolean)
        .reduce((sum, t) => sum + Number(t!.valor), 0)

    // Categorias (id -> nome) para o filtro
    const categoryOptions = Array.from(
        new Map(
            transactions
                .filter(t => !!t.categoria_id)
                .map(t => [t.categoria_id, t.categoria?.nome ?? t.categoria_id] as const)
        ).entries()
    )
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

    // Suporte a teclado
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevenir ações padrão apenas para teclas específicas
            if (['Enter', 'Escape'].includes(e.key)) {
                e.preventDefault()
            }

            // Se estiver focado em um input, não processar
            if (e.target instanceof HTMLInputElement) return

            // Números
            if (/^[0-9]$/.test(e.key)) {
                handleButtonClick(e.key)
            }
            // Operadores
            else if (['+', '-', '*', '/', 'x', 'X'].includes(e.key)) {
                const operator = e.key === '*' ? 'x' : e.key.toLowerCase()
                handleButtonClick(operator)
            }
            // Vírgula/ponto
            else if ([',', '.'].includes(e.key)) {
                handleButtonClick(',')
            }
            // Enter = calcular
            else if (e.key === 'Enter') {
                handleButtonClick('=')
            }
            // Escape = fechar
            else if (e.key === 'Escape') {
                onOpenChange(false)
            }
            // C ou Delete = limpar
            else if (e.key.toLowerCase() === 'c' || e.key === 'Delete') {
                handleButtonClick('C')
            }
            // Backspace = apagar último
            else if (e.key === 'Backspace') {
                handleButtonClick('⌫')
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, display])

    // Evitar seleção "sobrando" ao trocar filtros/resultado
    useEffect(() => {
        setSelectedItems(new Set())
    }, [filterMonth, filterYear, filterType, filterCategory, filterStatus, transactions.length])

    const handleButtonClick = (value: string) => {
        if (value === 'C') {
            setDisplay('0')
        } else if (value === '⌫') {
            setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
        } else if (value === '=') {
            try {
                const formula = display.replace(/x/g, '*').replace(/,/g, '.')
                const result = eval(formula)
                setDisplay(result.toFixed(2).replace('.', ','))
            } catch {
                setDisplay('Erro')
            }
        } else {
            setDisplay(prev => prev === '0' ? value : prev + value)
        }
    }

    const insertValue = (value: number) => {
        setDisplay(prev => prev === '0' ? value.toFixed(2).replace('.', ',') : prev + value.toFixed(2).replace('.', ','))
    }

    const toggleSelectAll = () => {
        if (selectedItems.size === filteredTransactions.length) {
            setSelectedItems(new Set())
        } else {
            setSelectedItems(new Set(filteredTransactions.map(t => t.id)))
        }
    }

    const toggleSelectItem = (id: string) => {
        const newSet = new Set(selectedItems)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedItems(newSet)
    }


    const formatDate = (dateString: string) => {
        const date = parseLocalDate(dateString)
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
    }

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px]">
                <DialogHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IconTile icon={Calculator} size="sm" />
                            <DialogTitle className="text-lg">
                                Calculadora Inteligente
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                    {/* Display */}
                    <div className="bg-secondary/50 rounded-xl p-4 mb-4 border border-border relative group overflow-hidden">
                        <div className="text-3xl font-bold text-foreground text-right font-display tracking-tight">
                            {display}
                        </div>
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-full" />
                    </div>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="mb-4 grid w-full grid-cols-2">
                            <TabsTrigger
                                value="quick"
                                className="gap-2"
                            >
                                <TrendingUp className="h-4 w-4" />
                                Acesso Rápido
                            </TabsTrigger>
                            <TabsTrigger
                                value="selector"
                                className="gap-2"
                            >
                                <Filter className="h-4 w-4" />
                                Seletor de Dados
                            </TabsTrigger>
                        </TabsList>

                        {/* Acesso Rápido */}
                        <TabsContent value="quick" className="space-y-2 outline-none">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="eyebrow">
                                        Dados do Mês Atual
                                    </h3>
                                    <div className="text-2xs text-muted-foreground">
                                        {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                                    {/* Receitas do Mês */}
                                    <div className="bg-success/5 border border-success/20 rounded-md p-2 hover:bg-success/10 transition-all cursor-pointer group" onClick={() => insertValue(stats.total_receitas)}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <div className="h-5 w-5 rounded bg-success/20 flex items-center justify-center">
                                                <TrendingUp className="h-2.5 w-2.5 text-success" />
                                            </div>
                                            <span className="eyebrow">
                                                Receitas
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold text-foreground font-display">
                                            {formatCurrency(stats.total_receitas)}
                                        </div>
                                    </div>

                                    {/* Despesas do Mês */}
                                    <div className="bg-destructive/5 border border-destructive/20 rounded-md p-2 hover:bg-destructive/10 transition-all cursor-pointer group" onClick={() => insertValue(stats.total_despesas)}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <div className="h-5 w-5 rounded bg-destructive/20 flex items-center justify-center">
                                                <TrendingDown className="h-2.5 w-2.5 text-destructive" />
                                            </div>
                                            <span className="eyebrow">
                                                Despesas
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold text-foreground font-display">
                                            {formatCurrency(stats.total_despesas)}
                                        </div>
                                    </div>

                                    {/* Saldo Atual */}
                                    <div className="bg-brand-1/5 border border-brand-1/20 rounded-md p-2 hover:bg-brand-1/10 transition-all cursor-pointer group" onClick={() => insertValue(stats.saldo_atual)}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <div className="h-5 w-5 rounded bg-brand-1/20 flex items-center justify-center">
                                                <Wallet className="h-2.5 w-2.5 text-brand-1" />
                                            </div>
                                            <span className="eyebrow">
                                                Saldo
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold text-foreground font-display">
                                            {formatCurrency(stats.saldo_atual)}
                                        </div>
                                    </div>

                                    {/* Receitas Recebidas */}
                                    <div className="bg-success/5 border border-success/20 rounded-md p-2 hover:bg-success/10 transition-all cursor-pointer group" onClick={() => insertValue(receitasRecebidas)}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <div className="h-5 w-5 rounded bg-success/20 flex items-center justify-center">
                                                <CheckCircle2 className="h-2.5 w-2.5 text-success" />
                                            </div>
                                            <span className="eyebrow">
                                                Recebidas
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold text-foreground font-display">
                                            {formatCurrency(receitasRecebidas)}
                                        </div>
                                    </div>

                                    {/* Despesas Pagas */}
                                    <div className="bg-warning/5 border border-warning/20 rounded-md p-2 hover:bg-warning/10 transition-all cursor-pointer group col-span-2" onClick={() => insertValue(despesasPagas)}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <div className="h-5 w-5 rounded bg-warning/20 flex items-center justify-center">
                                                <CheckCircle2 className="h-2.5 w-2.5 text-warning" />
                                            </div>
                                            <span className="eyebrow">
                                                Pagas
                                            </span>
                                        </div>
                                        <div className="text-sm font-bold text-foreground font-display">
                                            {formatCurrency(despesasPagas)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Calculadora */}
                            <div className="mt-1">
                                <h3 className="eyebrow mb-2">
                                    Calculadora
                                </h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {['C', '⌫', '%', '÷'].map((btn) => (
                                        <Button
                                            key={btn}
                                            variant="ghost"
                                            className={cn(
                                                "h-11 rounded-lg text-base font-semibold tabular-nums transition-colors",
                                                "bg-secondary/50 hover:bg-secondary border border-border text-foreground"
                                            )}
                                            onClick={() => handleButtonClick(btn === '÷' ? '/' : btn)}
                                        >
                                            {btn}
                                        </Button>
                                    ))}
                                    {['7', '8', '9', 'x'].map((btn) => (
                                        <Button
                                            key={btn}
                                            variant="ghost"
                                            className={cn(
                                                "h-11 rounded-lg text-base font-semibold tabular-nums transition-colors",
                                                btn === 'x'
                                                    ? "bg-warning/10 hover:bg-warning hover:text-warning-foreground text-warning border border-warning/20"
                                                    : "bg-secondary/50 hover:bg-secondary border border-border text-foreground"
                                            )}
                                            onClick={() => handleButtonClick(btn)}
                                        >
                                            {btn}
                                        </Button>
                                    ))}
                                    {['4', '5', '6', '-'].map((btn) => (
                                        <Button
                                            key={btn}
                                            variant="ghost"
                                            className={cn(
                                                "h-11 rounded-lg text-base font-semibold tabular-nums transition-colors",
                                                btn === '-'
                                                    ? "bg-warning/10 hover:bg-warning hover:text-warning-foreground text-warning border border-warning/20"
                                                    : "bg-secondary/50 hover:bg-secondary border border-border text-foreground"
                                            )}
                                            onClick={() => handleButtonClick(btn)}
                                        >
                                            {btn}
                                        </Button>
                                    ))}
                                    {['1', '2', '3', '+'].map((btn) => (
                                        <Button
                                            key={btn}
                                            variant="ghost"
                                            className={cn(
                                                "h-11 rounded-lg text-base font-semibold tabular-nums transition-colors",
                                                btn === '+'
                                                    ? "bg-warning/10 hover:bg-warning hover:text-warning-foreground text-warning border border-warning/20"
                                                    : "bg-secondary/50 hover:bg-secondary border border-border text-foreground"
                                            )}
                                            onClick={() => handleButtonClick(btn)}
                                        >
                                            {btn}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        className="h-11 rounded-lg text-base font-semibold tabular-nums transition-colors bg-secondary/50 hover:bg-secondary border border-border text-foreground col-span-2"
                                        onClick={() => handleButtonClick('00')}
                                    >
                                        00
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-11 rounded-lg text-base font-semibold tabular-nums transition-colors bg-secondary/50 hover:bg-secondary border border-border text-foreground"
                                        onClick={() => handleButtonClick('0')}
                                    >
                                        0
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-11 rounded-lg text-base font-semibold tabular-nums transition-colors bg-secondary/50 hover:bg-secondary border border-border text-foreground"
                                        onClick={() => handleButtonClick(',')}
                                    >
                                        ,
                                    </Button>
                                    <Button
                                        className="h-11 rounded-lg text-base font-semibold tabular-nums transition-colors bg-primary hover:bg-primary/90 text-primary-foreground col-span-4 shadow-lg"
                                        onClick={() => handleButtonClick('=')}
                                    >
                                        =
                                    </Button>
                                </div>
                            </div>

                        </TabsContent>

                        {/* Seletor de Dados */}
                        <TabsContent value="selector" className="space-y-4 outline-none">
                            {/* Filtros de Tipo */}
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant={filterType === 'despesa' ? 'default' : 'outline'}
                                    className={cn(
                                        "h-12 rounded-xl font-bold transition-all",
                                        filterType === 'despesa'
                                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            : "border-border hover:bg-secondary"
                                    )}
                                    onClick={() => setFilterType('despesa')}
                                >
                                    <TrendingDown className="h-4 w-4 mr-2" />
                                    Despesas
                                </Button>
                                <Button
                                    variant={filterType === 'receita' ? 'default' : 'outline'}
                                    className={cn(
                                        "h-12 rounded-xl font-bold transition-all",
                                        filterType === 'receita'
                                            ? "bg-primary/90 hover:bg-success/90 text-primary-foreground"
                                            : "border-border hover:bg-secondary"
                                    )}
                                    onClick={() => setFilterType('receita')}
                                >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Receitas
                                </Button>
                            </div>

                            {/* Filtros */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <Select value={filterCategory} onValueChange={setFilterCategory}>
                                    <SelectTrigger className="h-12 rounded-xl border-border bg-secondary/50">
                                        <SelectValue placeholder="Todas categorias" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas categorias</SelectItem>
                                        {categoryOptions.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                                    <SelectTrigger className="h-12 rounded-xl border-border bg-secondary/50">
                                        <SelectValue placeholder="Todos status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos status</SelectItem>
                                        <SelectItem value="liquidado">Liquidado</SelectItem>
                                        <SelectItem value="pendente">Pendente</SelectItem>
                                        <SelectItem value="atrasado">Atrasado</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={filterMonth.toString()} onValueChange={(v) => setFilterMonth(Number(v))}>
                                    <SelectTrigger className="h-12 rounded-xl border-border bg-secondary/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((month, idx) => (
                                            <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(Number(v))}>
                                    <SelectTrigger className="h-12 rounded-xl border-border bg-secondary/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2024, 2025, 2026].map(year => (
                                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Busca */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por descrição..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-12 pl-11 rounded-xl border-border bg-secondary/50"
                                />
                            </div>

                            {/* Controles de Seleção */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={toggleSelectAll}
                                        className="text-xs font-bold"
                                        asChild
                                    >
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault()
                                                    toggleSelectAll()
                                                }
                                            }}
                                        >
                                            <Checkbox
                                                checked={selectedItems.size === filteredTransactions.length && filteredTransactions.length > 0}
                                                className="mr-2"
                                            />
                                            Selecionar todos
                                        </div>
                                    </Button>
                                    {selectedItems.size > 0 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedItems(new Set())}
                                            className="text-xs font-bold text-destructive"
                                        >
                                            Limpar ({selectedItems.size})
                                        </Button>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {filteredTransactions.length} itens encontrados
                                </div>
                            </div>

                            {/* Lista de Transações */}
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {filteredTransactions.map((transaction) => (
                                    <div
                                        key={transaction.id}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                            selectedItems.has(transaction.id)
                                                ? "bg-brand-1/10 border-brand-1/30"
                                                : "bg-secondary/30 border-border hover:bg-secondary/50"
                                        )}
                                        onClick={() => toggleSelectItem(transaction.id)}
                                    >
                                        <Checkbox checked={selectedItems.has(transaction.id)} />
                                        <div className="flex-1">
                                            <div className="font-bold text-sm text-foreground">{transaction.descricao}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {transaction.categoria?.nome || 'Sem categoria'} • {formatDate(transaction.data_vencimento)}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "font-bold text-sm",
                                            transaction.tipo_transacao === 'receita' ? 'text-success' : 'text-destructive'
                                        )}>
                                            {formatCurrency(Number(transaction.valor))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totais e Ações */}
                            <div className="space-y-3 pt-4 border-t border-border">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total filtrado:</span>
                                    <span className="text-lg font-bold text-foreground font-display">
                                        {formatCurrency(totalFiltered)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total selecionado ({selectedItems.size}):</span>
                                    <span className="text-lg font-bold text-foreground font-display">
                                        {formatCurrency(totalSelected)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        className="h-12 rounded-xl border-border hover:bg-secondary font-bold"
                                        onClick={() => insertValue(totalFiltered)}
                                    >
                                        <Filter className="h-4 w-4 mr-2" />
                                        Usar Total Filtrado
                                    </Button>
                                    <Button
                                        className="h-12 rounded-xl shadow-lg"
                                        onClick={() => insertValue(totalSelected)}
                                        disabled={selectedItems.size === 0}
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Usar Selecionados
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="p-4 bg-secondary/30 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground/60 font-medium">
                        Dica: Use o teclado para calcular mais rápido
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
