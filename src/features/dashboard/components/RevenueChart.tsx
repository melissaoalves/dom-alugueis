'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface ChartMonth {
  month: string
  Recebido: number
  Despesas: number
}

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold capitalize text-slate-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  )
}

interface Props {
  data: ChartMonth[]
}

export function RevenueChart({ data }: Props) {
  if (data.every(d => d.Recebido === 0 && d.Despesas === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        Nenhum dado financeiro nos últimos 6 meses.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => formatBRL(v)}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }}
        />
        <Bar dataKey="Recebido" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
