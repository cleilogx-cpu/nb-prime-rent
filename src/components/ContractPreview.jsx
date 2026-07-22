import { Printer } from 'lucide-react'

function formatDate(value) {
  if (!value) {
    return 'Não informado'
  }
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }
  return parsedDate.toLocaleDateString('pt-BR')
}

export default function ContractPreview({ contract, onPrint }) {
  if (!contract) {
    return null
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Modelo inicial para revisão</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Contrato de Locação de Veículo</h3>
        </div>
        <button type="button" onClick={onPrint} className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-3 text-sm font-semibold text-amber-200">
          <Printer size={16} />
          Imprimir / Salvar como PDF
        </button>
      </div>

      <div className="mt-8 rounded-[24px] border border-white/10 bg-white p-6 text-slate-900 print:shadow-none" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="border-b border-slate-300 pb-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">NB Prime Rent</p>
          <h4 className="mt-2 text-2xl font-semibold">Contrato de Locação de Veículo</h4>
          <p className="mt-2 text-sm">Número: {contract.contract_number || 'NB-2026-0001'}</p>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Locador</p>
            <p className="mt-2 text-sm">NB Prime Capital</p>
            <p className="mt-1 text-sm">Gestão de locação e contratos</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Locatário</p>
            <p className="mt-2 text-sm">{contract.tenant_name || 'Locatário não informado'}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold">Veículo</p>
            <p className="mt-2 text-sm">{contract.vehicle_model || 'Modelo não informado'}</p>
            <p className="mt-1 text-sm">Placa: {contract.vehicle_plate || 'Não informado'}</p>
            <p className="mt-1 text-sm">Cor: {contract.vehicle_color || 'Não informada'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold">Valores e prazo</p>
            <p className="mt-2 text-sm">Valor semanal: {contract.weekly_rent ? `R$ ${Number(contract.weekly_rent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}</p>
            <p className="mt-1 text-sm">Caução: {contract.deposit ? `R$ ${Number(contract.deposit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}</p>
            <p className="mt-1 text-sm">Início: {formatDate(contract.start_date)}</p>
            <p className="mt-1 text-sm">Término: {formatDate(contract.end_date)}</p>
          </div>
        </div>
        <div className="mt-6 text-sm leading-7">
          <p className="font-semibold">Cláusulas</p>
          <p className="mt-2">{contract.clauses || 'Cláusulas padrão para revisão jurídica.'}</p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <p className="border-t border-slate-300 pt-4 text-sm font-semibold">Assinatura do locador</p>
            <p className="mt-10 text-sm">________________________</p>
          </div>
          <div>
            <p className="border-t border-slate-300 pt-4 text-sm font-semibold">Assinatura do locatário</p>
            <p className="mt-10 text-sm">________________________</p>
          </div>
        </div>
      </div>
    </div>
  )
}
