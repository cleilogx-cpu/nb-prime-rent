export default function PaymentFilters({ search, setSearch, period, setPeriod, statusFilter, setStatusFilter, paymentMethod, setPaymentMethod, financeFilter, setFinanceFilter, destinationFilter, setDestinationFilter }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Pesquisar</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Placa ou locatário" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Período</span>
        <input type="date" value={period} onChange={(event) => setPeriod(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none" />
      </label>
      <label className="space-y-2">
        <span className="text-sm uppercase tracking-[0.35em] text-slate-500">Status</span>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
          <option value="">Todos</option>
          <option value="Pago">Pago</option>
          <option value="Parcial">Parcial</option>
          <option value="Pendente">Pendente</option>
          <option value="Atrasado">Atrasado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </label>
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
  )
}
