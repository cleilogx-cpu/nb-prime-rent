export default function VehicleFilters({ search, setSearch, statusFilter, setStatusFilter, financeFilter, setFinanceFilter }) {
  return (
    <div className="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 shadow-sm shadow-black/20 md:grid-cols-[1.5fr_1fr_1fr]">
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Buscar</span>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Placa, modelo ou locatário"
          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Status</span>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="">Todos</option>
          <option value="Disponível">Disponível</option>
          <option value="Alugado">Alugado</option>
          <option value="Manutenção">Manutenção</option>
          <option value="Inativo">Inativo</option>
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span className="text-xs uppercase tracking-[0.3em] text-slate-500">Modelo financeiro</span>
        <select
          value={financeFilter}
          onChange={(event) => setFinanceFilter(event.target.value)}
          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="">Todos</option>
          <option value="partners">Alternância entre sócios</option>
          <option value="savings">Fundo do veículo</option>
        </select>
      </label>
    </div>
  )
}
