"use client"

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts"
import { cn, formatCurrency } from "@/lib/utils"

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

/** Paleta categórica do design system (tokens --chart-1..8, ajustados por tema). */
const DEFAULT_COLORS = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`)

/** Itens que o Recharts injeta no `content` da Legend (subconjunto usado aqui). */
interface LegendItem {
    value?: string | number
    color?: string
}

function ScrollableLegend({ payload }: { payload?: readonly LegendItem[] }) {
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
                        <span className="text-xs text-muted-foreground">
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
            <div className={cn("flex flex-col items-center justify-center text-sm text-muted-foreground", className)} style={{ height }}>
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
                        paddingAngle={3}
                        stroke="var(--card)"
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
                            backgroundColor: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            color: "var(--popover-foreground)",
                            fontSize: "12px",
                        }}
                        itemStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
                        formatter={(value: number | undefined) => [
                            formatCurrency(value),
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
