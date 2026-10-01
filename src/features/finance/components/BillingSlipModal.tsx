'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Download, Copy, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import { buildPixPayload } from '../utils/pixPayload'
import { getEnergyBillInfo, EnergyBillInfo } from '../services/energyReadingsService'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface LineItem {
  label: string
  value: number
  highlight?: boolean
}

// Leitura do relógio que originou o valor de energia da cobrança
interface EnergyDetail {
  prevReading: number
  currReading: number
  kwh: number
  rate: number
}

interface Props {
  entry: any
  totalValue: number
  lines: LineItem[]
  energy?: EnergyDetail
  title?: string        // cabeçalho do boleto (ex.: "Cobrança de Aluguel", "Conta de Energia")
  docType?: string      // prefixo do nome do arquivo e descrição do PIX (ex.: "cobranca", "energia")
  onClose: () => void
}

const fmtKwh = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)

const fmtRate = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 }).format(v)

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')

const fmtShortMonth = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

function daysBetween(start: string, end: string) {
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// Meses cobertos entre start e end (exclui o dia final): 25/08 → 01/10 = "agosto e setembro"
function monthRangeLabel(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  e.setDate(e.getDate() - 1)
  const months: string[] = []
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  while (cur <= e && months.length < 12) {
    months.push(MONTH_NAMES[cur.getMonth()])
    cur.setMonth(cur.getMonth() + 1)
  }
  if (months.length === 0) return ''
  if (months.length === 1) return months[0]
  return `${months.slice(0, -1).join(', ')} e ${months[months.length - 1]}`
}

export function BillingSlipModal({ entry, totalValue, lines, energy, title = 'Cobrança de Aluguel', docType = 'cobranca', onClose }: Props) {
  const slipRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [billInfo, setBillInfo] = useState<EnergyBillInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(!!energy)

  // Período da leitura, histórico de consumo e emitente — só quando há energia por leitura
  useEffect(() => {
    if (!energy) return
    let cancelled = false
    getEnergyBillInfo(entry)
      .then(info => { if (!cancelled) setBillInfo(info) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingInfo(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id])

  const history = billInfo?.history ?? []
  const maxKwh = Math.max(...history.map(h => h.kwh), 1)

  const handleCopy = () => {
    if (!pixPayload) return
    navigator.clipboard.writeText(pixPayload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const contract = entry.contract
  const property = entry.property
  const pixKey: string = contract?.pix_key_guarantee ?? ''
  const merchantName = (property?.title ?? 'Proprietario').slice(0, 25)
  const merchantCity = (property?.cidade ?? 'Brasil').slice(0, 15)
  const dueDate = new Date(entry.due_date + 'T00:00:00').toLocaleDateString('pt-BR')
  const referenceMonth = new Date(entry.reference_month + 'T00:00:00').toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const pixPayload = pixKey
    ? buildPixPayload({
        pixKey,
        amount: totalValue,
        merchantName,
        merchantCity,
        description: `${title} ${merchantName}`.slice(0, 72),
      })
    : null

  const handleDownload = async () => {
    if (!slipRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(slipRef.current, { pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${docType}-${property?.title ?? 'imovel'}-${entry.reference_month}.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        {/* Slip (área que vira PNG) */}
        <div
          ref={slipRef}
          className="rounded-xl bg-white p-6 shadow-2xl"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {/* Header */}
          <div className="mb-4 border-b border-gray-200 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              {title}
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">{property?.title ?? '—'}</p>
            <p className="text-sm text-gray-500">{contract?.tenant?.full_name ?? '—'}</p>
            <p className="mt-1 text-xs text-gray-400 capitalize">{referenceMonth}</p>
          </div>

          {/* Itens */}
          <div className="mb-4 space-y-1.5">
            {lines.map((line, i) => (
              <div
                key={i}
                className={`flex justify-between text-sm ${
                  line.highlight ? 'font-bold text-gray-900' : 'text-gray-600'
                }`}
              >
                <span>{line.label}</span>
                <span className={line.highlight ? 'text-indigo-700' : ''}>{fmt(line.value)}</span>
              </div>
            ))}
          </div>

          {/* Demonstrativo de energia */}
          {energy && (
            <div className="mb-4 rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Consumo de energia
              </p>
              {billInfo?.prevDate && billInfo?.currDate && (
                billInfo.prevKind === 'initial' ? (
                  // Primeira leitura (base 0): mostra os meses cobertos, sem as datas
                  <p className="mt-1 text-xs text-gray-500">
                    Referente a {monthRangeLabel(billInfo.prevDate, billInfo.currDate)}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Período: {fmtDate(billInfo.prevDate)} a {fmtDate(billInfo.currDate)} ({daysBetween(billInfo.prevDate, billInfo.currDate)} dias)
                  </p>
                )
              )}
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-gray-400">Leitura anterior</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtKwh(energy.prevReading)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Leitura atual</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtKwh(energy.currReading)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Consumo</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtKwh(energy.kwh)} kWh</p>
                </div>
                <div>
                  <p className="text-gray-400">Tarifa por kWh</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtRate(energy.rate)}</p>
                </div>
              </div>

              {history.length > 1 && (
                <div className="mt-3 border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-400">Histórico de consumo (kWh)</p>
                  <div className="mt-1 flex items-end gap-2">
                    {history.map((h, i) => (
                      <div key={h.referenceMonth} className="flex flex-1 flex-col items-center">
                        <span className="text-[10px] text-gray-500">{fmtKwh(h.kwh)}</span>
                        <div
                          className={`w-full rounded-sm ${i === history.length - 1 ? 'bg-indigo-600' : 'bg-indigo-200'}`}
                          style={{ height: `${Math.max((h.kwh / maxKwh) * 40, 2)}px` }}
                        />
                        <span className="mt-0.5 text-[10px] text-gray-400">{fmtShortMonth(h.referenceMonth)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vencimento */}
          <div className="mb-5 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs text-gray-500">Vencimento</span>
            <span className="text-sm font-semibold text-gray-800">{dueDate}</span>
          </div>

          {/* QR Code PIX */}
          {pixPayload ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Pague com PIX
              </p>
              <div className="rounded-lg border border-gray-200 p-2">
                <QRCodeSVG value={pixPayload} size={160} />
              </div>
              <p className="text-center text-xs text-gray-400 break-all">{pixKey}</p>
              <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="break-all text-center text-[10px] text-gray-400 leading-snug">{pixPayload}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center">
              <p className="text-xs text-gray-400">Chave PIX não cadastrada no contrato</p>
            </div>
          )}

          {billInfo?.issuer?.name && (
            <p className="mt-4 border-t border-gray-100 pt-3 text-center text-[10px] text-gray-400">
              Emitido por {billInfo.issuer.name}
              {billInfo.issuer.document && ` · CPF ${billInfo.issuer.document}`}
            </p>
          )}
        </div>

        {/* Botões fora do slip */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-600 text-slate-300 transition hover:border-slate-400 hover:text-white"
          >
            <X size={15} />
          </button>
          {pixPayload && (
            <button
              onClick={handleCopy}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                copied
                  ? 'border-emerald-700 bg-emerald-900/30 text-emerald-400'
                  : 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white'
              }`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copiado!' : 'Copia e cola'}
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading || loadingInfo}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            <Download size={15} />
            {downloading ? 'Gerando...' : 'Baixar PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
