'use client'

import { useRef, useState } from 'react'
import { X, Download, Copy, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toPng } from 'html-to-image'
import { buildPixPayload } from '../utils/pixPayload'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface LineItem {
  label: string
  value: number
  highlight?: boolean
}

interface Props {
  entry: any
  totalValue: number
  lines: LineItem[]
  onClose: () => void
}

export function BillingSlipModal({ entry, totalValue, lines, onClose }: Props) {
  const slipRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

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
        description: `Aluguel ${merchantName}`.slice(0, 72),
      })
    : null

  const handleDownload = async () => {
    if (!slipRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(slipRef.current, { pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `cobranca-${property?.title ?? 'imovel'}-${entry.reference_month}.png`
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
              Cobrança de Aluguel
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
            disabled={downloading}
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
