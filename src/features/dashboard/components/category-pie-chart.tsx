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

export function CategoryPieChart({ data = [], className, height = 300 }: CategoryPieChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center text-muted-foreground text-[10px] uppercase font-black tracking-widest opacity-50 italic", className)} style={{ height }}>
                Nenhum dado para exibir
            </div>
        )
    }

    return (
        <div className={cn("h-full w-full", className)} style={{ minHeight: height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
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
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        formatter={(value) => (
                            <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mr-4">
                                {value}
                            </span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}
