import { supabase } from '../lib/supabaseClient.js'
import { calculateNextDueDate, calculateNextPartnerBeneficiary } from '../lib/paymentLogic.js'
import { matchPaymentToCharge, unmatchChargeForPayment } from './chargesService.js'
import { recalculateReceivedAmount } from './depositsService.js'
import { RECEIPT_TYPE } from '../lib/constants.js'

const PAYMENT_TABLE = 'rental_payments'
const AUDIT_TABLE = 'audit_logs'

const receiptTypeMap = {
  recebimento: 'rent',
  aluguel: 'rent',
  rent: 'rent',
  caução: 'deposit',
  caucao: 'deposit',
  deposit: 'deposit',
  transporte: 'transport',
  transport: 'transport',
  outro: 'other',
  other: 'other',
}

const paymentMethodMap = {
  pix: 'pix',
  transferência: 'transfer',
  transferencia: 'transfer',
  transfer: 'transfer',
  ted: 'transfer',
  dinheiro: 'cash',
  cash: 'cash',
  cartão: 'card',
  cartao: 'card',
  card: 'card',
  outro: 'other',
  other: 'other',
}

function normalizeReceiptType(value) {
  const normalized = String(value ?? 'rent').trim().toLowerCase()
  return receiptTypeMap[normalized] ?? 'other'
}

function normalizePaymentMethod(value) {
  const normalized = String(value ?? 'pix').trim().toLowerCase()
  return paymentMethodMap[normalized] ?? 'other'
}

// Distribuição/destino (sócios x fundo, Clei/Edson) foi aposentada -- esta
// função é compartilhada por createPayment/updatePayment, então não decide
// mais nenhum valor pros dois campos: finance_model/destination
// simplesmente não entram no objeto devolvido. Pra um recebimento NOVO
// (createPayment), isso grava null (a coluna deixou de ser NOT NULL --
// migration 010). Pra editar um recebimento existente (updatePayment), o
// UPDATE não toca nessas colunas, preservando o valor histórico real (ou
// o null de um recebimento já criado no modelo novo).
function normalizePaymentPayload(payload) {
  return {
    vehicle_id: payload.vehicle_id,
    rental_id: payload.rental_id || null,
    tenant_id: payload.tenant_id || null,
    contract_id: payload.contract_id || null,
    payment_date:
      payload.payment_date || new Date().toISOString().slice(0, 10),

    amount:
      payload.amount === '' ||
      payload.amount === null ||
      payload.amount === undefined
        ? null
        : Number(payload.amount),

    receipt_type: normalizeReceiptType(
      payload.receipt_type ?? payload.type,
    ),

    payment_method: normalizePaymentMethod(payload.payment_method),

    reference_period:
      payload.reference_period ?? payload.period ?? null,

    receipt_reference:
      payload.receipt_reference ??
      payload.provisional_receipt ??
      null,

    notes: payload.notes || null,
  }
}

/**
 * Mantém os nomes esperados pelos componentes antigos da interface.
 */
function mapPaymentFromDatabase(payment) {
  if (!payment) {
    return payment
  }

  return {
    ...payment,
    type: payment.receipt_type,
    status: payment.is_cancelled ? 'Cancelado' : 'Pago',
    beneficiary:
      payment.destination === 'Clei' || payment.destination === 'Edson'
        ? payment.destination
        : null,
  }
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data?.user?.id ?? null
}

async function logPaymentAudit(
  action,
  entityId,
  beforeData,
  afterData,
  justification,
) {
  const userId = await getCurrentUserId()

  const payload = {
    action,
    entity: PAYMENT_TABLE,
    entity_id: entityId,
    user_id: userId,
    before_data: beforeData,
    after_data: afterData,
    justification: justification ?? null,
  }

  const { error } = await supabase.from(AUDIT_TABLE).insert(payload)

  if (error) {
    console.warn(
      'Falha ao registrar auditoria de recebimento:',
      error.message,
    )
  }
}

export async function listPayments(filters = {}) {
  const {
    search = '',
    period = '',
    status = '',
    paymentMethod = '',
    financeModel = '',
    destination = '',
  } = filters

  // `contracts(periodicity)` só serve pra mostrar "Aluguel — Semanal/Mensal"
  // no card -- não afeta nada financeiro (join opcional/nullable: um
  // recebimento antigo sem contract_id simplesmente não mostra periodicidade).
  let query = supabase
    .from(PAYMENT_TABLE)
    .select('*, contracts(periodicity)')
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(
      `notes.ilike.%${search}%,receipt_reference.ilike.%${search}%,reference_period.ilike.%${search}%`,
    )
  }

  if (period) {
    const [startDate, endDate] = period.split('|')

    if (startDate) {
      query = query.gte('payment_date', startDate)
    }

    if (endDate) {
      query = query.lte('payment_date', endDate)
    }
  }

  if (status === 'Pago') {
    query = query.eq('is_cancelled', false)
  }

  if (status === 'Cancelado') {
    query = query.eq('is_cancelled', true)
  }

  if (paymentMethod) {
    query = query.eq(
      'payment_method',
      normalizePaymentMethod(paymentMethod),
    )
  }

  if (financeModel) {
    query = query.eq('finance_model', financeModel)
  }

  if (destination) {
    query = query.eq('destination', destination)
  }

  const { data, error } = await query

  return {
    data: (data ?? []).map(mapPaymentFromDatabase),
    error,
  }
}

export async function createPayment(payload) {
  const normalizedPayload = normalizePaymentPayload(payload)
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from(PAYMENT_TABLE)
    .insert({
      ...normalizedPayload,
      created_by: userId,
    })
    .select('*')
    .single()

  if (!error && data) {
    await logPaymentAudit(
      'CREATE',
      data.id,
      null,
      data,
      payload.justification,
    )
  }

  return {
    data: mapPaymentFromDatabase(data),
    error,
  }
}

export async function updatePayment(id, payload) {
  const currentPayment = await getPaymentById(id)
  const normalizedPayload = normalizePaymentPayload(payload)

  const { data, error } = await supabase
    .from(PAYMENT_TABLE)
    .update(normalizedPayload)
    .eq('id', id)
    .eq('is_cancelled', false)
    .select('*')
    .single()

  if (!error && data) {
    await logPaymentAudit(
      'UPDATE',
      data.id,
      currentPayment.data,
      data,
      payload.justification,
    )
  }

  return {
    data: mapPaymentFromDatabase(data),
    error,
  }
}

export async function cancelPayment(id, payload = {}) {
  const currentPayment = await getPaymentById(id)
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from(PAYMENT_TABLE)
    .update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancelled_by: payload.cancelled_by ?? userId,
      cancellation_reason:
        payload.cancellation_reason || 'Cancelamento solicitado pelo usuário',
    })
    .eq('id', id)
    .eq('is_cancelled', false)
    .select('*')
    .single()

  if (!error && data) {
    await logPaymentAudit(
      'CANCEL',
      data.id,
      currentPayment.data,
      data,
      payload.cancellation_reason,
    )

    // Desfaz a ligação com a cobrança (volta a aparecer em "atrasados" se
    // for o caso) ou recalcula o saldo da caução -- um recebimento
    // cancelado não deve continuar contando como dinheiro recebido.
    if (data.receipt_type === RECEIPT_TYPE.RENT) {
      await unmatchChargeForPayment(data.id)

      // Distribuição/rodízio foi aposentada pra recebimento novo (createPayment
      // não escreve mais finance_model='partners'/destination='Clei'|'Edson'),
      // então este bloco só é alcançado ao cancelar um recebimento ANTIGO --
      // devolve a vez pro sócio que tinha recebido este pagamento, já que
      // cancelar não pode "consumir" a alternância. Passa por
      // `calculateNextPartnerBeneficiary` (não grava `data.destination` puro)
      // porque `next_destination` já guarda o valor invertido da criação --
      // gravar o valor cru duplicaria a inversão e mandaria a próxima cobrança
      // pra pessoa errada.
      if (
        data.finance_model === 'partners' &&
        (data.destination === 'Clei' || data.destination === 'Edson')
      ) {
        await updateVehicleNextDestination(
          data.vehicle_id,
          calculateNextPartnerBeneficiary(data.destination),
        )
      }
    } else if (data.receipt_type === RECEIPT_TYPE.DEPOSIT && data.contract_id) {
      await recalculateReceivedAmount(data.contract_id)
    }
  }

  return {
    data: mapPaymentFromDatabase(data),
    error,
  }
}

export async function getPaymentById(id) {
  const { data, error } = await supabase
    .from(PAYMENT_TABLE)
    .select('*')
    .eq('id', id)
    .single()

  return {
    data: mapPaymentFromDatabase(data),
    error,
  }
}

// Distribuição/rodízio Clei-Edson aposentada -- recebimento novo não lê nem
// grava vehicles.next_destination, não olha o finance_model do contrato
// ativo, não calcula beneficiário nenhum. O nome da função ficou (evita
// mexer no import do PaymentForm.jsx), mas o corpo virou só "cria o
// recebimento e liga à cobrança/caução correspondente".
export async function createPaymentWithDestinationRules(payload) {
  const result = await createPayment(payload)

  if (!result.error && result.data) {
    // Liga o recebimento à cobrança/caução correspondente -- é isso que dá
    // uma relação confiável entre "o que deveria ser pago" e "o que
    // efetivamente entrou", em vez de só inferir atraso pela ausência
    // genérica de recebimentos.
    if (result.data.receipt_type === RECEIPT_TYPE.RENT) {
      await matchPaymentToCharge(result.data)
    } else if (result.data.receipt_type === RECEIPT_TYPE.DEPOSIT && result.data.contract_id) {
      await recalculateReceivedAmount(result.data.contract_id)
    }
  }

  return result
}

export async function updateVehicleNextDestination(
  vehicleId,
  nextDestination,
) {
  if (!vehicleId) {
    return {
      data: null,
      error: new Error('Veículo não informado.'),
    }
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update({ next_destination: nextDestination })
    .eq('id', vehicleId)
    .select('*')
    .single()

  return { data, error }
}

export async function calculateNextPaymentDueDate(
  currentDueDate,
  fallbackDate,
) {
  return calculateNextDueDate(currentDueDate, fallbackDate)
}