import { EnergyReadingList } from '@/src/features/finance/components/EnergyReadingList'

export const metadata = {
  title: 'Leituras de energia | DOM Aluguéis',
}

export default async function EnergyPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams

  // Padrão: mês anterior (mesmo padrão de Mensalidades — mês que foi morado)
  const now = new Date()
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const mes = Number(params.mes)
  const ano = Number(params.ano)
  const month = mes >= 1 && mes <= 12 ? mes : defaultMonth
  const year = ano > 2000 ? ano : defaultYear

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Leituras de energia</h1>
        <p className="text-slate-400 text-sm mt-1">
          Informe o valor atual do relógio de cada apartamento. O consumo é a diferença para a leitura anterior.
        </p>
      </div>
      <EnergyReadingList initialMonth={month} initialYear={year} />
    </div>
  )
}
