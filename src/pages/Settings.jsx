import { useState } from 'react'
import { Building2, FileText, Scale, SlidersHorizontal, UserRound } from 'lucide-react'
import SettingsSection from '../components/SettingsSection.jsx'
import ContractTemplateEditor from '../components/ContractTemplateEditor.jsx'

const COMPANY_FIELDS = [
  { name: 'company_name', label: 'Nome / Razão Social', required: true, wide: true },
  { name: 'company_trade_name', label: 'Nome Fantasia (quando aplicável)', wide: true, hint: 'Se preenchido, é o nome exibido no topo do sistema.' },
  { name: 'company_document', label: 'CPF/CNPJ' },
  { name: 'company_phone', label: 'Telefone / WhatsApp' },
  { name: 'company_email', label: 'E-mail', type: 'email', wide: true },
  { name: 'company_address', label: 'Endereço completo', type: 'textarea', wide: true },
]

const RESPONSIBLE_FIELDS = [
  { name: 'resp_name', label: 'Nome completo', required: true, wide: true },
  { name: 'resp_cpf', label: 'CPF', required: true },
  { name: 'resp_rg', label: 'RG (se utilizado)' },
  { name: 'resp_phone', label: 'Telefone' },
  { name: 'resp_email', label: 'E-mail (se utilizado)', type: 'email' },
  { name: 'resp_role', label: 'Cargo / Função (se aplicável)', wide: true },
  { name: 'resp_address', label: 'Endereço (aparece como endereço do locador)', type: 'textarea', wide: true },
]

const RULES_FIELDS = [
  { name: 'late_fee_percent', label: 'Multa por atraso (%)', type: 'number', required: true, min: 0, max: 100, hint: 'Campo [MULTA POR ATRASO] do modelo.' },
  { name: 'late_interest_percent_month', label: 'Juros de mora ao mês (%)', type: 'number', required: true, min: 0, max: 100, hint: 'Campo [JUROS DE MORA] do modelo.' },
]

const PREFERENCES_FIELDS = [
  {
    name: 'min_cnh_validity_days',
    label: 'Prazo mínimo de validade da CNH (dias)',
    type: 'number',
    required: true,
    min: 0,
    max: 3650,
    step: 1,
    hint: 'Não permite contratar quando a CNH do locatário vence em menos dias que isto.',
  },
]

const TABS = [
  { key: 'empresa', label: 'Dados da Empresa', icon: Building2 },
  { key: 'responsavel', label: 'Responsável pelo Contrato', icon: UserRound },
  { key: 'modelo', label: 'Modelo de Contrato', icon: FileText },
  { key: 'regras', label: 'Regras Contratuais', icon: Scale },
  { key: 'preferencias', label: 'Preferências Operacionais', icon: SlidersHorizontal },
]

export default function Settings() {
  const [tab, setTab] = useState('empresa')

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/30 sm:p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Configurações</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Sua empresa e seus contratos</h2>
        <p className="mt-2 text-sm text-slate-400">Área exclusiva do administrador.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Seções de configurações" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {TABS.map((item) => {
            const Icon = item.icon
            const selected = tab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-current={selected ? 'page' : undefined}
                className={`flex min-h-12 shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  selected
                    ? 'border-amber-300/30 bg-amber-300/15 text-amber-200'
                    : 'border-white/10 bg-slate-900/70 text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="whitespace-nowrap lg:whitespace-normal">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <section className="min-w-0 rounded-[28px] border border-white/10 bg-slate-950/70 p-4 sm:p-6">
          {tab === 'empresa' ? (
            <SettingsSection
              key="empresa"
              title="Dados da Empresa"
              description="Dados da empresa que utiliza o sistema. O nome aparece no topo do aplicativo e pode ser usado nos contratos."
              fields={COMPANY_FIELDS}
            />
          ) : null}
          {tab === 'responsavel' ? (
            <SettingsSection
              key="responsavel"
              title="Responsável pelo Contrato"
              description="Pessoa que representa a empresa no contrato."
              fields={RESPONSIBLE_FIELDS}
              note="Estes dados são separados da empresa: a empresa tem CNPJ e endereço próprios; aqui fica a pessoa que figura como locador/representante. Não é cadastrada assinatura."
            />
          ) : null}
          {tab === 'modelo' ? <ContractTemplateEditor /> : null}
          {tab === 'regras' ? (
            <SettingsSection
              key="regras"
              title="Regras Contratuais"
              description="Valores usados como campos dinâmicos no contrato."
              fields={RULES_FIELDS}
              note="Mudanças valem só para contratos novos: cada contrato guarda os valores da data em que foi criado."
            />
          ) : null}
          {tab === 'preferencias' ? (
            <SettingsSection
              key="preferencias"
              title="Preferências Operacionais"
              description="Regras de operação da sua locadora."
              fields={PREFERENCES_FIELDS}
            />
          ) : null}
        </section>
      </div>
    </div>
  )
}
