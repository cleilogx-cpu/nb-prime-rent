import { supabase } from '../lib/supabaseClient.js'
import { CONTRACT_DEFAULTS } from '../lib/constants.js'

const TABLE = 'company_settings'

export const EMPTY_SETTINGS = {
  company_name: '',
  company_trade_name: '',
  company_document: '',
  company_phone: '',
  company_email: '',
  company_address: '',
  resp_name: '',
  resp_cpf: '',
  resp_rg: '',
  resp_phone: '',
  resp_email: '',
  resp_role: '',
  resp_address: '',
  late_fee_percent: CONTRACT_DEFAULTS.lateFeePercent,
  late_interest_percent_month: CONTRACT_DEFAULTS.lateInterestPercentMonth,
  min_cnh_validity_days: 30,
}

/**
 * Administrador = app_metadata.role === 'admin' (definido pelo painel do
 * Supabase, nunca pelo próprio usuário). A mesma regra é aplicada no banco
 * (RLS, função is_app_admin) -- esconder a tela aqui é só conveniência.
 */
export function isAdminUser(user) {
  return user?.app_metadata?.role === 'admin'
}

/** Configurações da empresa (linha única). Sem registro ainda = valores vazios. */
export async function getCompanySettings() {
  const { data, error } = await supabase.from(TABLE).select('*').maybeSingle()

  if (error) {
    return { data: { ...EMPTY_SETTINGS }, error }
  }

  return { data: { ...EMPTY_SETTINGS, ...(data || {}) }, error: null }
}

const EDITABLE_FIELDS = Object.keys(EMPTY_SETTINGS)

/** Salva só os campos informados (cada seção de Configurações salva a sua parte). */
export async function saveCompanySettings(patch) {
  const { data: userData } = await supabase.auth.getUser()

  const values = {}
  EDITABLE_FIELDS.forEach((field) => {
    if (field in patch) {
      values[field] = patch[field]
    }
  })

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      { singleton: true, ...values, updated_at: new Date().toISOString(), updated_by: userData?.user?.id ?? null },
      { onConflict: 'singleton' },
    )
    .select('*')
    .single()

  return { data: data ? { ...EMPTY_SETTINGS, ...data } : null, error }
}

/** Multa/juros que um contrato NOVO grava (snapshot) -- vêm das Configurações. */
export async function getContractRules() {
  const { data } = await getCompanySettings()
  return {
    lateFeePercent: Number(data.late_fee_percent ?? CONTRACT_DEFAULTS.lateFeePercent),
    lateInterestPercentMonth: Number(data.late_interest_percent_month ?? CONTRACT_DEFAULTS.lateInterestPercentMonth),
    minCnhValidityDays: Number(data.min_cnh_validity_days ?? 30),
  }
}
