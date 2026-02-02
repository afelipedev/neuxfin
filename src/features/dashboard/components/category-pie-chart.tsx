"use client"

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts"
import { cn } from "@/lib/utils"

interface CategoryData {
    name: string
    value: number
    color?: string
}

interface CategoryPieChartProps {
    data?: CategoryData[]
    className?: string
    height?: number
}

const DEFAULT_COLORS = ["#26c8a6", "#45d6bc", "#64e4d3", "#83f1e9", "#a2ffff", "#fb7185", "#f43f5e", "#e11d48"]

function ScrollableLegend({ payload }: { payload?: any[] }) {
    if (!payload || payload.length === 0) return null

    return (
        <div className="mt-2 max-h-[72px] overflow-y-auto custom-scrollbar px-1">
            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                {payload.map((entry, idx) => (
                    <li key={`${entry?.value ?? 'item'}-${idx}`} className="flex items-center gap-1.5">
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry?.color }}
                        />
                        <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                            {entry?.value}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export function CategoryPieChart({ data = [], className, height = 300 }: CategoryPieChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center text-muted-foreground text-[10px] uppercase font-black tracking-widest opacity-50 italic", className)} style={{ height }}>
                Nenhum dado para exibir
            </div>
        )
    }

    const isCompact = height < 280
    const innerRadius = isCompact ? 45 : 60
    const outerRadius = isCompact ? 65 : 80

    return (
        <div className={cn("w-full", className)} style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(9, 9, 11, 0.8)',
                            border: 'none',
                            borderRadius: '12px',
                            backdropFilter: 'blur(8px)',
                            color: '#fff',
                            fontSize: '10px'
                        }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: number | undefined) => [
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0),
                            ''
                        ]}
                    />
                    <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        content={<ScrollableLegend />}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
