"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface CashFlowData {
    name: string
    receitas: number
    despesas: number
}

interface CashFlowChartProps {
    data?: CashFlowData[]
    loading?: boolean
}

/** Props que o Recharts injeta no `content` do Tooltip (subconjunto usado aqui). */
interface CashFlowTooltipProps {
    active?: boolean
    label?: string | number
    payload?: Array<{ name?: string | number; value?: number | string; color?: string }>
}

const CustomTooltip = ({ active, payload, label }: CashFlowTooltipProps) => {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
            <p className="eyebrow mb-1.5">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                    <span className="text-muted-foreground">{entry.name === "receitas" ? "Receitas" : "Despesas"}:</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(entry.value, { fractionDigits: 0 })}</span>
                </div>
            ))}
        </div>
    )
}

export function CashFlowChart({ data = [], loading = false }: CashFlowChartProps) {
    if (loading) {
        return <Skeleton className="h-full w-full" />
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhum dado disponível
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                <XAxis
                    dataKey="name"
                    stroke="var(--chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: string) => value.charAt(0).toUpperCase() + value.slice(1)}
                />
                <YAxis
                    stroke="var(--chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                    content={<CustomTooltip />}
                />
                <Bar dataKey="receitas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="despesas" fill="var(--chart-5)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
        </ResponsiveContainer>
    )
}
