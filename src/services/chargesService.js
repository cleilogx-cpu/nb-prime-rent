import { supabase } from '../lib/supabaseClient.js'
import { generatePaymentSchedule } from '../lib/contractLogic.js'
import { CHARGE_STATUS, RENTAL_STATUS, CONTRACT_STATUS } from '../lib/constants.js'
import { DUE_SOON_DAYS, addDaysISO, daysUntil, todayLocalISO } from '../lib/chargeDue.js'

const TABLE = 'contract_charges'

/**
 * Gera o cronograma de cobranças de um contrato recém-assinado e persiste
 * como linhas reais em `contract_charges`. Antes desta tabela existir, o
 * cronograma só existia como texto impresso no contrato (recalculado toda
 * vez, nunca gravado) -- por isso "Próximos vencimentos"/"Pagamentos
 * atrasados" nunca puderam ser reais. Chamado uma única vez, dentro de
 * contractsService.signContract, logo após a locação (`rentals`) ser criada.
 */
export async function generateChargesForContract(contract, rental) {
  const schedule = generatePaymentSchedule(
    contract.start_date,
    contract.end_date,
    contract.periodicity,
    contract.payment_amount,
  )

  if (schedule.length === 0) {
    return { data: [], error: null }
  }

  // Nunca gera duas vezes o cronograma do mesmo contrato (ex.: ativação
  // repetida depois de uma falha no meio) -- cobranças duplicadas
  // apareceriam em dobro em "próximos vencimentos"/"atrasados".
  const { count: existingCount, error: existingError } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('contract_id', contract.id)

  if (existingError) {
    return { data: [], error: existingError }
  }
  if ((existingCount ?? 0) > 0) {
    return { data: [], error: null }
  }

  const rows = schedule.map((item) => ({
    contract_id: contract.id,
    rental_id: rental.id,
    vehicle_id: contract.vehicle_id,
    tenant_id: contract.tenant_id,
    sequence_number: item.week,
    due_date: item.due_date,
    amount: item.amount,
    status: CHARGE_STATUS.PENDENTE,
  }))

  const { data, error } = await supabase.from(TABLE).insert(rows).select('*')

  return { data: data ?? [], error }
}

// Select usado pelas duas listas do Dashboard (upcoming/overdue). `!inner`
// nas duas tabelas embutidas é o que transforma o filtro de status delas
// (abaixo) numa condição de fato -- sem `!inner` o Postgrest ignoraria o
// filtro embutido e traria a cobrança mesmo com a locação/contrato não
// ativos. Isso é proteção redundante ao cancelamento feito em
// locationsService.endLocation: mesmo que uma cobrança fique "Pendente"
// por engano (dado antigo de antes desta lógica existir, edição direta no
// banco, bug futuro etc.), ela só aparece aqui se a locação estiver
// realmente "Ativa" e o contrato realmente "Ativo" -- o que já cobre
// qualquer cobrança de locação/contrato encerrado ou cancelado, incluindo
// as com due_date posterior à data efetiva de encerramento.
const ACTIVE_CHARGE_SELECT = '*, contracts!inner(contract_number, status), vehicles(plate, model), rentals!inner(status), tenants(full_name, phone, whatsapp, address_street, address_number, address_neighborhood, address_zip, address_complement, address_city, address_state, address)'

/**
 * Próximos vencimentos: cobranças pendentes de locações/contratos ativos
 * com vencimento de hoje até daqui a `days` dias (padrão 7), mais próximas
 * primeiro. Usado no Dashboard (cobrança preventiva). A data de "hoje" é a
 * do calendário local -- antes era a data em UTC, que à noite já era o dia
 * seguinte e empurrava o "hoje" e o "atrasado" um dia.
 */
export async function listUpcomingCharges({ days = DUE_SOON_DAYS, limit = 50 } = {}) {
  const today = todayLocalISO()
  const until = addDaysISO(today, days)

  const { data, error } = await supabase
    .from(TABLE)
    .select(ACTIVE_CHARGE_SELECT)
    .eq('status', CHARGE_STATUS.PENDENTE)
    .eq('rentals.status', RENTAL_STATUS.ATIVA)
    .eq('contracts.status', CONTRACT_STATUS.ATIVO)
    .gte('due_date', today)
    .lte('due_date', until)
    .order('due_date', { ascending: true })
    .limit(limit)

  return { data: data ?? [], error }
}

/**
 * Pagamentos atrasados: cobranças pendentes com vencimento já passado, de
 * locações/contratos ativos. `overdue_days` é calculado aqui em cima da
 * data de hoje -- não fica gravado, porque "hoje" muda todo dia.
 */
export async function listOverdueCharges(limit = 100) {
  const today = todayLocalISO()

  const { data, error } = await supabase
    .from(TABLE)
    .select(ACTIVE_CHARGE_SELECT)
    .eq('status', CHARGE_STATUS.PENDENTE)
    .eq('rentals.status', RENTAL_STATUS.ATIVA)
    .eq('contracts.status', CONTRACT_STATUS.ATIVO)
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(limit)

  if (error) {
    return { data: [], error }
  }

  const withOverdueDays = (data ?? []).map((charge) => ({
    ...charge,
    overdue_days: Math.max(0, -daysUntil(charge.due_date, today)),
  }))

  return { data: withOverdueDays, error: null }
}

/**
 * Liga um recebimento tipo Aluguel à cobrança prevista mais antiga ainda
 * pendente daquela locação, marcando-a como Paga. Sem isso não existe
 * relação confiável entre cobrança prevista e pagamento realizado -- seria
 * só inferir atraso pela ausência genérica de recebimentos, que é
 * explicitamente o que o pedido pediu pra evitar.
 */
export async function matchPaymentToCharge(payment) {
  if (!payment?.rental_id) {
    return { data: null, error: null }
  }

  const { data: charge, error: findError } = await supabase
    .from(TABLE)
    .select('id')
    .eq('rental_id', payment.rental_id)
    .eq('status', CHARGE_STATUS.PENDENTE)
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (findError || !charge) {
    return { data: null, error: findError }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: CHARGE_STATUS.PAGO, paid_payment_id: payment.id })
    .eq('id', charge.id)
    .select('*')
    .single()

  return { data, error }
}

/**
 * Desfaz a ligação quando o recebimento que a criou é cancelado -- a
 * cobrança volta a aparecer em "próximos vencimentos"/"atrasados".
 */
export async function unmatchChargeForPayment(paymentId) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: CHARGE_STATUS.PENDENTE, paid_payment_id: null })
    .eq('paid_payment_id', paymentId)
    .select('*')

  return { data: data ?? [], error }
}
