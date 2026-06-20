'use client'

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const COLORS = [
  '#f43f5e',  // rose
  '#f97316',  // orange
  '#eab308',  // yellow
  '#22c55e',  // green
  '#06b6d4',  // cyan
  '#3b82f6',  // blue
  '#d946ef',  // fuchsia
  '#ec4899',  // pink
  '#10b981',  // emerald
  '#f59e0b',  // amber
  '#14b8a6',  // teal
  '#8b5cf6',  // violet
  '#84cc16',  // lime
  '#0ea5e9',  // sky
  '#ef4444',  // red
  '#64748b',  // slate
  '#a855f7',  // purple
  '#e11d48',  // crimson
]

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface Props {
  expenses: { category: string; amount: number }[]
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm shadow-xl">
      <p className="font-semibold text-white">{item.name}</p>
      <p style={{ color: item.payload.fill }} className="mt-1 font-medium">
        {fmt(item.value)}
      </p>
      <p className="text-xs text-slate-500">{item.payload.percent}% do total</p>
    </div>
  )
}

function CustomLegend({ payload }: any) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {payload.map((item: any) => (
        <div key={item.value} className="flex items-center gap-2 text-xs">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="truncate text-slate-400">{item.value}</span>
          <span className="ml-auto shrink-0 text-slate-300">
            {fmt(item.payload.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ExpenseCategoryChart({ expenses }: Props) {
  if (!expenses.length) return null

  const grouped = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})

  const total = Object.values(grouped).reduce((s, v) => s + v, 0)

  // Recharts v3: fill incluído nos dados diretamente (Cell foi depreciado)
  const data = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      fill: COLORS[i % COLORS.length],
      percent: Math.round((value / total) * 100),
    }))

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Despesas por categoria</h3>
        <span className="text-sm font-semibold text-rose-400">{fmt(total)}</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
