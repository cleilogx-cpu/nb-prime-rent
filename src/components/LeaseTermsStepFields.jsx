import { PERIODICITY_LABELS } from '../lib/constants.js'

const DURATION_PRESETS = [
  { label: '1 mês', months: 1 },
  { label: '2 meses', months: 2 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '12 meses', months: 12 },
  { label: 'Personalizado', months: 'custom' },
]

const PAYMENT_AMOUNT_LABEL = {
  daily: 'Valor da diária',
  weekly: 'Valor semanal',
  biweekly: 'Valor da quinzena',
  monthly: 'Valor mensal',
}

export { DURATION_PRESETS }

/**
 * Bloco "Prazo, periodicidade e valores" -- extraído de ContractForm.jsx
 * (Fase 2 do Contrato Inteligente) pra ser reaproveitado no formulário de
 * edição e na etapa "Locação" do wizard, sem duplicar o cálculo de
 * computedEndDate/computedWeeks (que continua vivendo em quem usa este
 * componente, via as props já calculadas).
 */
// Impede que o scroll do mouse mude o valor de um campo numérico focado
// (comportamento padrão do navegador) -- tirar o foco no wheel neutraliza
// isso sem bloquear o scroll da página em si.
const blurOnWheel = (event) => event.target.blur()

export default function LeaseTermsStepFields({
  form,
  errors,
  customMonths,
  setCustomMonths,
  computedEndDate,
  computedWeeks,
  onChange,
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Prazo, periodicidade e valores</p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>Data de início</span>
          <input type="date" value={form.start_date} onChange={(event) => onChange('start_date', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
          {errors.start_date ? <span className="text-xs text-rose-300">{errors.start_date}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>Prazo do contrato</span>
          <select
            value={form.duration_months}
            onChange={(event) => onChange('duration_months', event.target.value === 'custom' ? 'custom' : Number(event.target.value))}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            {DURATION_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.months}>{preset.label}</option>
            ))}
          </select>
          {errors.duration_months ? <span className="text-xs text-rose-300">{errors.duration_months}</span> : null}
        </label>

        {form.duration_months === 'custom' ? (
          <label className="flex flex-col gap-2 text-sm text-slate-300">
            <span>Quantos meses?</span>
            <input type="number" min="1" value={customMonths} onChange={(event) => setCustomMonths(event.target.value)} onWheel={blurOnWheel} className="no-spinner rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" placeholder="5" />
          </label>
        ) : null}

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>Data final (calculada — pode ajustar)</span>
          <input type="date" value={form.end_date || computedEndDate || ''} onChange={(event) => onChange('end_date', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
          <span className="text-xs text-slate-500">{computedWeeks} semana(s) de vigência total</span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>Periodicidade do pagamento</span>
          <select
            value={form.periodicity}
            onChange={(event) => onChange('periodicity', event.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          >
            {Object.entries(PERIODICITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>{PAYMENT_AMOUNT_LABEL[form.periodicity] || 'Valor do pagamento'}</span>
          <input type="number" min="0" step="0.01" value={form.payment_amount} onChange={(event) => onChange('payment_amount', event.target.value)} onWheel={blurOnWheel} className="no-spinner rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
          {errors.payment_amount ? <span className="text-xs text-rose-300">{errors.payment_amount}</span> : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>Caução</span>
          <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={(event) => onChange('deposit_amount', event.target.value)} onWheel={blurOnWheel} className="no-spinner rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-300">
          <span>Quilometragem inicial</span>
          <input type="number" min="0" value={form.initial_km} onChange={(event) => onChange('initial_km', event.target.value)} onWheel={blurOnWheel} className="no-spinner rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm text-slate-300">
        <span>Observações</span>
        <textarea rows="3" value={form.observations} onChange={(event) => onChange('observations', event.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none" />
      </label>
    </div>
  )
}
