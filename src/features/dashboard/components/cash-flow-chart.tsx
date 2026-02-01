"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Rectangle } from "recharts"

interface CashFlowData {
    name: string
    receitas: number
    despesas: number
}

interface CashFlowChartProps {
    data?: CashFlowData[]
    loading?: boolean
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value)
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-900 dark:bg-zinc-950 border border-white/10 rounded-xl p-3 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    {label}
                </p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {entry.name === 'receitas' ? 'Receitas' : 'Despesas'}:
                        </span>
                        <span className={`text-[11px] font-black tracking-tight ${entry.name === 'receitas' ? 'text-brand-1' : 'text-rose-500'
                            }`}>
                            {formatCurrency(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export function CashFlowChart({ data = [], loading = false }: CashFlowChartProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 rounded-full border-2 border-brand-1/20 border-t-brand-1 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Carregando...
                    </span>
                </div>
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
                        Nenhum dado disponível
                    </span>
                </div>
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <XAxis
                    dataKey="name"
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.toUpperCase()}
                    className="font-black tracking-widest"
                />
                <YAxis
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                    className="font-black tracking-widest"
                />
                <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={<CustomTooltip />}
                />
                <Bar
                    dataKey="receitas"
                    fill="var(--brand-1)"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    activeBar={<Rectangle fill="var(--brand-2)" stroke="var(--brand-1)" strokeWidth={1} />}
                />
                <Bar
                    dataKey="despesas"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    barSize={24}
                    activeBar={<Rectangle fill="#fb7185" stroke="#f43f5e" strokeWidth={1} />}
                />
            </BarChart>
        </ResponsiveContainer>
    )
}
