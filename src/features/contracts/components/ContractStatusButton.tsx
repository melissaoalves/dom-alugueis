'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban } from 'lucide-react'
import { createClient } from '@/src/shared/utils/supabase/client'

interface Props {
  contractId: string
  currentStatus: string
  propertyTitle: string
  tenantName: string
}

export function ContractStatusButton({ contractId, currentStatus, propertyTitle, tenantName }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (currentStatus === 'rescindido') return null

  const handleRescind = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('contracts')
        .update({ status: 'rescindido', is_active: false })
        .eq('id', contractId)

      if (err) throw new Error(err.message)
      setShowModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        title="Rescindir contrato"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-900/50 text-rose-400 transition hover:bg-rose-900/20 hover:border-rose-700"
      >
        <Ban size={13} />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Rescindir contrato?</h2>
            <p className="mt-2 text-sm text-slate-400">
              Você está prestes a rescindir o contrato de{' '}
              <span className="font-medium text-white">{propertyTitle}</span> com{' '}
              <span className="font-medium text-white">{tenantName}</span>.
            </p>
            <p className="mt-2 text-sm text-rose-400">
              Esta ação encerra o contrato antes do prazo. Novas cobranças mensais não serão geradas.
            </p>

            {error && (
              <div className="mt-3 rounded-md border border-red-900/50 bg-red-900/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRescind}
                disabled={loading}
                className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
              >
                {loading ? 'Rescindindo...' : 'Confirmar Rescisão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
