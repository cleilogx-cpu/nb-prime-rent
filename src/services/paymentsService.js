import { supabase } from '../lib/supabaseClient.js'
import {
  buildPaymentDestinationLabel,
  calculateNextDueDate,
  calculateNextPartnerBeneficiary,
  validateFinancialDestination,
} from '../lib/paymentLogic.js'

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

function normalizeDestination(destination, financeModel, beneficiary) {
  if (financeModel === 'savings') {
    return 'Fundo do veículo'
  }

  const calculatedDestination = buildPaymentDestinationLabel(
    destination,
    financeModel,
  )

  if (
    calculatedDestination === 'Clei' ||
    calculatedDestination === 'Edson' ||
    calculatedDestination === 'Transporte' ||
    calculatedDestination === 'Outro'
  ) {
    return calculatedDestination
  }

  if (beneficiary === 'Clei' || beneficiary === 'Edson') {
    return beneficiary
  }

  return 'Outro'
}

function normalizePaymentPayload(payload) {
  const financeModel = payload.finance_model ?? 'partners'

  const destination = normalizeDestination(
    payload.destination,
    financeModel,
    payload.beneficiary,
  )

  validateFinancialDestination({
    financeModel,
    destination,
    beneficiary: payload.beneficiary,
  })

  return {
    vehicle_id: payload.vehicle_id,
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

    finance_model: financeModel,
    destination,

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

  let query = supabase
    .from(PAYMENT_TABLE)
    .select('*')
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

export async function getLastConfirmedPartnerBeneficiary(vehicleId) {
  const { data, error } = await supabase
    .from(PAYMENT_TABLE)
    .select('destination,created_at')
    .eq('vehicle_id', vehicleId)
    .eq('finance_model', 'partners')
    .eq('is_cancelled', false)
    .in('destination', ['Clei', 'Edson'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  return {
    data: data?.destination ?? null,
    error: null,
  }
}

export async function calculateNextPartnerBeneficiaryForVehicle(
  vehicleId,
  vehicleNextDestination,
) {
  const { data: lastBeneficiary, error } =
    await getLastConfirmedPartnerBeneficiary(vehicleId)

  if (error) {
    return { data: null, error }
  }

  const nextBeneficiary = calculateNextPartnerBeneficiary(
    lastBeneficiary || vehicleNextDestination,
  )

  return {
    data: nextBeneficiary,
    error: null,
  }
}

export async function createPaymentWithDestinationRules(payload) {
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id,next_destination,finance_model')
    .eq('id', payload.vehicle_id)
    .single()

  if (vehicleError) {
    return {
      data: null,
      error: vehicleError,
    }
  }

  const financeModel =
    payload.finance_model || vehicle.finance_model

  let destination = 'Fundo do veículo'
  let beneficiary = null

  if (financeModel === 'partners') {
    const { data: nextBeneficiary, error } =
      await calculateNextPartnerBeneficiaryForVehicle(
        payload.vehicle_id,
        vehicle.next_destination,
      )

    if (error) {
      return {
        data: null,
        error,
      }
    }

    beneficiary = nextBeneficiary
    destination = nextBeneficiary
  }

  const result = await createPayment({
    ...payload,
    finance_model: financeModel,
    beneficiary,
    destination,
  })

  if (!result.error && financeModel === 'partners') {
    const followingBeneficiary =
      calculateNextPartnerBeneficiary(beneficiary)

    await updateVehicleNextDestination(
      payload.vehicle_id,
      followingBeneficiary,
    )
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