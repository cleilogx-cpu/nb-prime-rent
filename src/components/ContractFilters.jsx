export default function ContractFilters({ search, setSearch, statusFilter, setStatusFilter, period, setPeriod, vehicleFilter, setVehicleFilter, tenantFilter, setTenantFilter, vehicles, tenants }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Pesquisar</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Número, placa ou locatário" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Status</span>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
          <option value="">Todos</option>
          <option value="Rascunho">Rascunho</option>
          <option value="Ativo">Ativo</option>
          <option value="Encerrado">Encerrado</option>
          <option value="Cancelado">Cancelado</option>
          <option value="Vencido">Vencido</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Período</span>
        <input type="date" value={period} onChange={(event) => setPeriod(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Veículo</span>
        <select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
          <option value="">Todos</option>
          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>)}
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Locatário</span>
        <select value={tenantFilter} onChange={(event) => setTenantFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
          <option value="">Todos</option>
          {tenants.map((tenant) => <option key={tenant} value={tenant}>{tenant}</option>)}
        </select>
      </label>
    </div>
  )
}
