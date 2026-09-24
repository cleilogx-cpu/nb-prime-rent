import { formatCPF } from '../lib/format.js'

/**
 * Bloco "Dados do locatário" -- extraído de ContractForm.jsx (Fase 2 do
 * Contrato Inteligente) pra ser reaproveitado no formulário de edição e na
 * etapa "Conferir dados" do wizard de novo contrato (onde esses campos
 * chegam pré-preenchidos pelo OCR na Fase 4, mas continuam 100% editáveis
 * -- conferência humana sempre obrigatória).
 */
export default function TenantFields({ tenant, onChange, errors }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Nome completo</span>
        <input value={tenant.full_name} onChange={(event) => onChange('full_name', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        {errors.full_name ? <span className="text-xs text-rose-300">{errors.full_name}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>CPF</span>
        <input
          value={tenant.cpf}
          onChange={(event) => onChange('cpf', formatCPF(event.target.value))}
          inputMode="numeric"
          maxLength={14}
          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          placeholder="000.000.000-00"
        />
        {errors.cpf ? <span className="text-xs text-rose-300">{errors.cpf}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>RG</span>
        <input value={tenant.rg} onChange={(event) => onChange('rg', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Telefone / WhatsApp</span>
        <input value={tenant.phone} onChange={(event) => onChange('phone', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-300 md:col-span-2">
        <span>Logradouro (Rua/Avenida)</span>
        <input value={tenant.address_street} onChange={(event) => onChange('address_street', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        {errors.address_street ? <span className="text-xs text-rose-300">{errors.address_street}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Número</span>
        <input value={tenant.address_number} onChange={(event) => onChange('address_number', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        {errors.address_number ? <span className="text-xs text-rose-300">{errors.address_number}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Bairro</span>
        <input value={tenant.address_neighborhood} onChange={(event) => onChange('address_neighborhood', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        {errors.address_neighborhood ? <span className="text-xs text-rose-300">{errors.address_neighborhood}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>CEP</span>
        <input value={tenant.address_zip} onChange={(event) => onChange('address_zip', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="00000-000" />
        {errors.address_zip ? <span className="text-xs text-rose-300">{errors.address_zip}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Complemento</span>
        <input value={tenant.address_complement} onChange={(event) => onChange('address_complement', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="Opcional" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Cidade</span>
        <input value={tenant.address_city} onChange={(event) => onChange('address_city', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        {errors.address_city ? <span className="text-xs text-rose-300">{errors.address_city}</span> : null}
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>UF</span>
        <input value={tenant.address_state} onChange={(event) => onChange('address_state', event.target.value.toUpperCase())} maxLength={2} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="RO" />
        {errors.address_state ? <span className="text-xs text-rose-300">{errors.address_state}</span> : null}
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>CNH (número)</span>
        <input value={tenant.cnh_number} onChange={(event) => onChange('cnh_number', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>CNH (validade)</span>
        <input type="date" value={tenant.cnh_validity} onChange={(event) => onChange('cnh_validity', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Data de nascimento</span>
        <input type="date" value={tenant.birth_date} onChange={(event) => onChange('birth_date', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
      </label>
    </div>
  )
}
