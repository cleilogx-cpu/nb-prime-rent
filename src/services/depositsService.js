import { supabase } from '../lib/supabaseClient.js'
import { DEPOSIT_STATUS } from '../lib/constants.js'
import { formatCurrency } from '../lib/format.js'

const TABLE = 'contract_deposits'
const DEPOSIT_SELECT = '*, contracts(contract_number, status, finance_model), vehicles(plate, model), tenants(full_name, cpf, phone)'

function computeStatusFromBalance(receivedAmount, totalAmount) {
  if (receivedAmount <= 0) return DEPOSIT_STATUS.PENDENTE
  if (receivedAmount < totalAmount) return DEPOSIT_STATUS.PARCIAL
  return DEPOSIT_STATUS.QUITADA
}

/**
 * Cria a caução na criação do contrato, ou sincroniza o valor total numa
 * edição enquanto o contrato ainda é Rascunho. `contract_id` é UNIQUE --
 * nunca cria uma segunda caução pro mesmo contrato -- e `received_amount`
 * nunca é sobrescrito aqui, só por recalculateReceivedAmount (a partir de
 * Recebimentos, a única fonte real de dinheiro que entrou).
 */
export async function createOrSyncDepositForContract(contract) {
  const { data: existing, error: findError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('contract_id', contract.id)
    .maybeSingle()

  if (findError) {
    return { data: null, error: findError }
  }

  if (existing) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ total_amount: Number(contract.deposit_amount || 0) })
      .eq('id', existing.id)
      .select('*')
      .single()

    return { data, error }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      contract_id: contract.id,
      vehicle_id: contract.vehicle_id,
      tenant_id: contract.tenant_id,
      total_amount: Number(contract.deposit_amount || 0),
      received_amount: 0,
      status: DEPOSIT_STATUS.PENDENTE,
    })
    .select('*')
    .single()

  return { data, error }
}

export async function listDeposits() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(DEPOSIT_SELECT)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error }
}

/**
 * Recalcula `received_amount` somando os lançamentos tipo Caução não
 * cancelados em Recebimentos daquele contrato -- é a única fonte de
 * verdade pro dinheiro que efetivamente entrou (o módulo Caução nunca
 * grava um valor recebido "na mão"). Chamado depois de criar ou cancelar
 * um recebimento de caução.
 */
export async function recalculateReceivedAmount(contractId) {
  const { data: deposit, error: depositError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('contract_id', contractId)
    .maybeSingle()

  if (depositError || !deposit) {
    return { data: null, error: depositError }
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('rental_payments')
    .select('amount')
    .eq('contract_id', contractId)
    .eq('receipt_type', 'deposit')
    .eq('is_cancelled', false)

  if (paymentsError) {
    return { data: null, error: paymentsError }
  }

  const receivedAmount = (payments ?? []).reduce((acc, item) => acc + Number(item.amount ?? 0), 0)

  // Se já está "A devolver"/"Devolvida" (locação encerrada), o status não
  // deve voltar pra Pendente/Parcial/Quitada só porque o saldo mudou.
  const status = deposit.status === DEPOSIT_STATUS.A_DEVOLVER || deposit.status === DEPOSIT_STATUS.DEVOLVIDA
    ? deposit.status
    : computeStatusFromBalance(receivedAmount, Number(deposit.total_amount || 0))

  const { data, error } = await supabase
    .from(TABLE)
    .update({ received_amount: receivedAmount, status })
    .eq('id', deposit.id)
    .select('*')
    .single()

  return { data, error }
}

/**
 * Chamado ao encerrar a locação (locationsService.endLocation): se algum
 * valor de caução foi efetivamente recebido, o status passa a indicar que
 * precisa ser devolvido. Se nunca recebeu nada, não há o que devolver.
 */
export async function markDepositPendingRefund(contractId) {
  const { data: deposit, error: findError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('contract_id', contractId)
    .maybeSingle()

  if (findError || !deposit) {
    return { data: null, error: findError }
  }

  if (Number(deposit.received_amount || 0) <= 0) {
    return { data: deposit, error: null }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: DEPOSIT_STATUS.A_DEVOLVER })
    .eq('id', deposit.id)
    .select('*')
    .single()

  return { data, error }
}

/**
 * Registra como foi combinado o pagamento do saldo da caução (ex: "Entrada
 * R$1.000 + duas parcelas de R$500"). É só texto informativo -- nunca conta
 * como dinheiro recebido; o que efetivamente entrou continua vindo só de
 * recalculateReceivedAmount, somando os lançamentos reais em Recebimentos.
 */
export async function updateAgreedTerms(depositId, agreedTerms) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ agreed_terms: agreedTerms || null })
    .eq('id', depositId)
    .select('*')
    .single()

  return { data, error }
}

async function getCurrentUserId() {
  const { data: userData, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }

  return userData?.user?.id ?? null
}

/**
 * Registra uma devolução (parcial ou total) da caução. Isso é SAÍDA de
 * dinheiro -- nunca cria linha em Recebimentos (seção 13 do pedido).
 * `refund_amount` é cumulativo -- soma no que já tinha sido devolvido, em
 * vez de sobrescrever, pra suportar devolução em várias parcelas de
 * verdade (seção 23). Só fecha como Devolvida quando o acumulado atinge o
 * valor recebido; enquanto sobrar saldo, continua A devolver. Cada
 * devolução parcial fica registrada em audit_logs, já que o campo em si
 * vira cumulativo e não guarda o histórico de cada lançamento sozinho.
 */
export async function registerRefund(depositId, payload) {
  const { data: deposit, error: fetchError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', depositId)
    .single()

  if (fetchError || !deposit) {
    return { data: null, error: fetchError || { message: 'Caução não encontrada.' } }
  }

  const amount = Number(payload.refund_amount || 0)
  if (amount <= 0) {
    return { data: null, error: { message: 'Informe um valor de devolução maior que zero.' } }
  }

  const receivedAmount = Number(deposit.received_amount || 0)
  const alreadyRefunded = Number(deposit.refund_amount || 0)
  const balance = Math.max(0, receivedAmount - alreadyRefunded)

  if (amount > balance) {
    return { data: null, error: { message: `O valor não pode passar do saldo a devolver (${formatCurrency(balance)}).` } }
  }

  const newRefundAmount = alreadyRefunded + amount
  const status = newRefundAmount >= receivedAmount ? DEPOSIT_STATUS.DEVOLVIDA : DEPOSIT_STATUS.A_DEVOLVER

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      refund_amount: newRefundAmount,
      refund_date: payload.refund_date || null,
      refund_notes: payload.refund_notes || null,
      status,
    })
    .eq('id', depositId)
    .select('*')
    .single()

  if (!error && data) {
    const userId = await getCurrentUserId()
    const { error: auditError } = await supabase.from('audit_logs').insert({
      action: 'REFUND',
      entity: 'contract_deposits',
      entity_id: depositId,
      user_id: userId,
      before_data: deposit,
      after_data: { ...data, refund_event_amount: amount },
    })
    if (auditError) {
      console.warn('Falha ao registrar auditoria da devolução:', auditError.message)
    }
  }

  return { data, error }
}
