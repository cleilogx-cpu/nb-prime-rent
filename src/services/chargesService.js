import { supabase } from '../lib/supabaseClient.js'
import { generatePaymentSchedule } from '../lib/contractLogic.js'
import { CHARGE_STATUS } from '../lib/constants.js'

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

/**
 * Próximos vencimentos: cobranças pendentes com vencimento hoje ou no
 * futuro, mais próximas primeiro. Usado na Visão Geral do Dashboard.
 */
export async function listUpcomingCharges(limit = 8) {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from(TABLE)
    .select('*, contracts(contract_number), vehicles(plate, model)')
    .eq('status', CHARGE_STATUS.PENDENTE)
    .gte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(limit)

  return { data: data ?? [], error }
}

/**
 * Pagamentos atrasados: cobranças pendentes com vencimento já passado.
 * `overdue_days` é calculado aqui em cima da data de hoje -- não fica
 * gravado, porque "hoje" muda todo dia.
 */
export async function listOverdueCharges(limit = 30) {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from(TABLE)
    .select('*, contracts(contract_number), vehicles(plate, model)')
    .eq('status', CHARGE_STATUS.PENDENTE)
    .lt('due_date', today)
    .order('due_date', { ascending: true })
    .limit(limit)

  if (error) {
    return { data: [], error }
  }

  const todayTime = new Date(`${today}T00:00:00`).getTime()

  const withOverdueDays = (data ?? []).map((charge) => {
    const dueTime = new Date(`${charge.due_date}T00:00:00`).getTime()
    const overdueDays = Math.max(0, Math.round((todayTime - dueTime) / (1000 * 60 * 60 * 24)))
    return { ...charge, overdue_days: overdueDays }
  })

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
