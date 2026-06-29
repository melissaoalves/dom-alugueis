'use client'

import { PieChart, Pie, Tooltip } from 'recharts'

const COLORS = [
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#d946ef', '#ec4899', '#10b981', '#f59e0b',
  '#14b8a6', '#8b5cf6', '#84cc16', '#0ea5e9', '#ef4444',
  '#64748b', '#a855f7', '#e11d48',
]

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface Props {
  expenses: { category: string; amount: number }[]
  monthLabel?: string
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold text-white">{item.name}</p>
      <p style={{ color: item.payload.fill }} className="mt-0.5 font-medium">{fmt(item.value)}</p>
      <p className="text-xs text-slate-500">{item.payload.percent}%</p>
    </div>
  )
}

export function ExpenseCategoryChart({ expenses, monthLabel }: Props) {
  if (!expenses.length) return null

  const grouped = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  const total = Object.values(grouped).reduce((s, v) => s + v, 0)

  const data = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
      percent: Math.round((value / total) * 100),
    }))

  return (
    <div className="h-full rounded-lg border border-slate-800 bg-slate-900 p-4 flex flex-col">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Despesas por categoria</h3>
          <span className="text-sm font-semibold text-rose-400">{fmt(total)}</span>
        </div>
        {monthLabel && (
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{monthLabel}</p>
        )}
      </div>

      <div className="flex flex-1 items-center gap-6 min-h-0">
        {/* Donut — tamanho fixo */}
        <div className="shrink-0">
          <PieChart width={160} height={160}>
            <Pie
              data={data}
              cx={80}
              cy={80}
              innerRadius={46}
              outerRadius={72}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            />
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </div>

        {/* Legenda */}
        <div className="flex-1 min-w-0 space-y-2">
          {data.map(item => (
            <div key={item.name} className="flex items-center gap-2 text-xs min-w-0">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.fill }} />
              <span className="flex-1 truncate text-slate-400">{item.name}</span>
              <span className="shrink-0 text-slate-300 font-medium">{fmt(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
