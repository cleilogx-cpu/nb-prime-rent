import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CarFront, Search } from 'lucide-react'
import { endLocation, listActiveLocations } from '../services/locationsService.js'
import { listDeposits } from '../services/depositsService.js'
import { formatCurrency, formatDate } from '../services/locationLogic.js'
import { PERIODICITY_LABELS } from '../lib/constants.js'
import LoadingScreen from '../components/LoadingScreen.jsx'
import EndLocationDialog from '../components/EndLocationDialog.jsx'
import Toast from '../components/Toast.jsx'

const FINANCE_LABELS = { partners: 'Sócios', savings: 'Fundo' }

function LocationCard({ location, onView, onEnd }) {
  const vehicle = location.vehicles
  const tenant = location.tenants

  return (
    <article className="rounded-[30px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">{vehicle?.plate || 'Sem placa'}</p>
          <h3 className="mt-3 text-xl font-semibold text-white">{vehicle?.model || 'Modelo não informado'}</h3>
        </div>
        <span className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
          Ativa
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Locatário</p>
            <p className="mt-2 text-base font-medium text-white">{tenant?.full_name || 'Sem locatário'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data início</p>
            <p className="mt-2 text-base font-medium text-white">{formatDate(location.start_date)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Previsão de término</p>
            <p className="mt-2 text-base font-medium text-white">{formatDate(location.expected_end_date)}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor ({PERIODICITY_LABELS[location.periodicity] || 'Semanal'})</p>
            <p className="mt-2 text-base font-medium text-white">{formatCurrency(location.payment_amount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Km inicial</p>
            <p className="mt-2 text-base font-medium text-white">{location.initial_km ?? 'Não informado'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Distribuição</p>
            <p className="mt-2 text-base font-medium text-white">{FINANCE_LABELS[location.contracts?.finance_model] || 'Não informado'}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => onView(location)} className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-200">
          Ver detalhes
        </button>
        <button type="button" onClick={() => onEnd(location)} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">
          Encerrar locação
        </button>
      </div>
    </article>
  )
}

export default function Locations() {
  const [locations, setLocations] = useState([])
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [endTarget, setEndTarget] = useState(null)
  const [endLoading, setEndLoading] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const loadData = async () => {
    setLoading(true)
    const [{ data, error: fetchError }, { data: depositsData }] = await Promise.all([
      listActiveLocations({ search }),
      listDeposits(),
    ])

    if (fetchError) {
      setError(fetchError.message || 'Falha ao carregar locações.')
      setLocations([])
    } else {
      setError(null)
      setLocations(data ?? [])
    }
    setDeposits(depositsData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const openView = (location) => {
    setSelectedLocation(location)
    setViewOpen(true)
  }

  const handleEndConfirm = async (payload) => {
    if (!endTarget) {
      return
    }

    setEndLoading(true)
    const { error } = await endLocation(endTarget.id, payload)
    setEndLoading(false)

    if (error) {
      setToast({ message: error.message || 'Não foi possível encerrar a locação.', type: 'error' })
      return
    }

    setToast({ message: 'Locação encerrada! O veículo já está disponível de novo.', type: 'success' })
    setEndTarget(null)
    await loadData()
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-8">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Locações</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Locações ativas</h2>
          <p className="mt-2 text-sm text-slate-400">
            Locações nascem automaticamente quando um contrato é assinado — não existe cadastro manual aqui.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-sm shadow-black/20">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Buscar</span>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Placa, modelo ou locatário"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </label>
      </div>

      {error ? (
        <div className="rounded-[28px] border border-rose-500/30 bg-rose-500/10 p-6 text-slate-100">
          <p className="text-lg font-semibold text-rose-100">Falha ao carregar as locações</p>
          <p className="mt-3 text-sm text-rose-200">{error}</p>
        </div>
      ) : null}

      {!error && locations.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-lg shadow-black/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-300">
            <AlertTriangle size={20} />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-white">Nenhuma locação ativa</h3>
          <p className="mt-2 text-sm text-slate-400">Assine um contrato na aba Contratos pra ver a locação aparecer aqui.</p>
        </div>
      ) : null}

      {!error && locations.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} onView={openView} onEnd={setEndTarget} />
          ))}
        </div>
      ) : null}

      {viewOpen && selectedLocation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Detalhes da locação</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{selectedLocation.vehicles?.plate || 'Locação'}</h3>
              </div>
              <button type="button" onClick={() => setViewOpen(false)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Fechar</button>
            </div>

            <div className="mt-8 space-y-6">
              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                <p className="flex items-center gap-2 text-sm uppercase tracking-[0.35em] text-slate-500"><CarFront size={14} /> Veículo</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Placa</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.vehicles?.plate || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Modelo</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.vehicles?.model || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Locatário</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Nome</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.tenants?.full_name || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Contrato</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.contracts?.contract_number || 'Não informado'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Valores e datas</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Valor ({PERIODICITY_LABELS[selectedLocation.periodicity] || 'Semanal'})</p>
                    <p className="mt-2 text-base font-medium text-white">{formatCurrency(selectedLocation.payment_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Km inicial</p>
                    <p className="mt-2 text-base font-medium text-white">{selectedLocation.initial_km ?? 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Data início</p>
                    <p className="mt-2 text-base font-medium text-white">{formatDate(selectedLocation.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Previsão de término</p>
                    <p className="mt-2 text-base font-medium text-white">{formatDate(selectedLocation.expected_end_date)}</p>
                  </div>
                </div>
              </div>

              {(() => {
                const deposit = deposits.find((item) => item.contract_id === selectedLocation.contract_id)
                if (!deposit) {
                  return null
                }
                const totalAmount = Number(deposit.total_amount || 0)
                const receivedAmount = Number(deposit.received_amount || 0)
                const balance = Math.max(0, totalAmount - receivedAmount)

                return (
                  <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Caução</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Prevista</p>
                        <p className="mt-2 text-base font-medium text-white">{formatCurrency(totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Recebida</p>
                        <p className="mt-2 text-base font-medium text-white">{formatCurrency(receivedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Saldo</p>
                        <p className="mt-2 text-base font-medium text-white">{formatCurrency(balance)}</p>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setEndTarget(selectedLocation)
                  setViewOpen(false)
                }}
                className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200"
              >
                Encerrar locação
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EndLocationDialog
        open={Boolean(endTarget)}
        location={endTarget}
        loading={endLoading}
        onClose={() => setEndTarget(null)}
        onConfirm={handleEndConfirm}
      />
    </div>
  )
}
