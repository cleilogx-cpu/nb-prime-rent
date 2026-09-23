import { MONTH_LABELS } from '../lib/paymentAggregation.js'

export const PERIOD_MODE = { MONTH: 'month', YEAR: 'year', CUSTOM: 'custom' }

export default function PaymentFilters({
  search, setSearch,
  periodMode, setPeriodMode,
  month, setMonth,
  year, setYear,
  customStart, setCustomStart,
  customEnd, setCustomEnd,
  onResetToCurrentMonth,
  statusFilter, setStatusFilter,
  paymentMethod, setPaymentMethod,
  financeFilter, setFinanceFilter,
  destinationFilter, setDestinationFilter,
  vehicleFilter, setVehicleFilter,
  vehicles = [],
  contractFilter, setContractFilter,
  contracts = [],
}) {
  const now = new Date()
  const isCurrentMonth = periodMode === PERIOD_MODE.MONTH && month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Pesquisar</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Placa ou locatário" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
        </label>
        <label className="space-y-2">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Veículo</span>
          <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
            <option value="">Todos os veículos</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Contrato</span>
          <select value={contractFilter} onChange={(event) => setContractFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
            <option value="">Todos os contratos</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.contract_number} — {contract.vehicles?.plate} — {contract.tenants?.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
            <option value="">Todos</option>
            <option value="Pago">Pago</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-1">
          {[
            { value: PERIOD_MODE.MONTH, label: 'Mês' },
            { value: PERIOD_MODE.YEAR, label: 'Ano' },
            { value: PERIOD_MODE.CUSTOM, label: 'Personalizado' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriodMode(option.value)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                periodMode === option.value ? 'bg-amber-300/15 text-amber-200' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {periodMode === PERIOD_MODE.MONTH ? (
          <>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              {MONTH_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>{label}</option>
              ))}
            </select>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </>
        ) : null}

        {periodMode === PERIOD_MODE.YEAR ? (
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : null}

        {periodMode === PERIOD_MODE.CUSTOM ? (
          <>
            <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
            <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
          </>
        ) : null}

        {isCurrentMonth ? null : (
          <button type="button" onClick={onResetToCurrentMonth} className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-200">
            Voltar pro mês atual
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Forma de pagamento</span>
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
            <option value="">Todas</option>
            <option value="PIX">PIX</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Transferência">Transferência</option>
            <option value="Cartão">Cartão</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Modelo financeiro</span>
          <select value={financeFilter} onChange={(event) => setFinanceFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
            <option value="">Todos</option>
            <option value="partners">Alternância entre sócios</option>
            <option value="savings">Fundo do veículo</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Destino</span>
          <select value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
            <option value="">Todos</option>
            <option value="Clei">Clei</option>
            <option value="Edson">Edson</option>
            <option value="Fundo do veículo">Fundo do veículo</option>
          </select>
        </label>
      </div>
    </div>
  )
}
