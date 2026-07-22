import { supabase } from '../lib/supabaseClient.js'
import { buildPaymentDestinationLabel, calculateNextDueDate, calculateNextPartnerBeneficiary, validateFinancialDestination } from '../lib/paymentLogic.js'

const PAYMENT_TABLE = 'payments'
const AUDIT_TABLE = 'audit_logs'

function normalizeMetadata(notes) {
  if (!notes) {
    return null
  }

  if (typeof notes === 'string') {
    try {
      return JSON.parse(notes)
    } catch (error) {
      return { note: notes }
    }
  }

  return notes
}

function serializeMetadata(metadata) {
  if (!metadata) {
    return null
  }

  if (typeof metadata === 'string') {
    return metadata
  }

  return JSON.stringify(metadata)
}

function normalizePaymentPayload(payload) {
  const financialDestination = buildPaymentDestinationLabel(payload.destination, payload.finance_model)
  const validationMessage = validateFinancialDestination({
    financeModel: payload.finance_model,
    destination: financialDestination,
    beneficiary: payload.beneficiary,
  })

  const notesMetadata = normalizeMetadata(payload.notes)

  return {
    vehicle_id: payload.vehicle_id ?? null,
    payment_date: payload.payment_date ?? null,
    type: payload.type ?? 'recebimento',
    amount: payload.amount === '' || payload.amount === null || payload.amount === undefined ? null : Number(payload.amount),
    destination: financialDestination,
    payment_method: payload.payment_method ?? null,
    status: payload.status ?? 'Pago',
    notes: serializeMetadata({
      ...notesMetadata,
      financeModel: payload.finance_model ?? null,
      beneficiary: payload.beneficiary ?? null,
      validationMessage,
      locationId: payload.location_id ?? null,
      locationTenant: payload.location_tenant ?? null,
      locationVehicle: payload.location_vehicle ?? null,
      provisionalReceipt: payload.provisional_receipt ?? null,
      isCompatMode: true,
      migrationNote: 'Campos financeiros expandidos serão migrados para colunas próprias em uma próxima sprint.',
    }),
    created_by: payload.created_by ?? null,
  }
}

async function getCurrentUserId() {
  const { data: userData, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }

  return userData?.user?.id ?? null
}

async function logPaymentAudit(action, entityId, beforeData, afterData, justification) {
  const userId = await getCurrentUserId()
  const payload = {
    action,
    entity: 'payments',
    entity_id: entityId,
    user_id: userId,
    before_data: beforeData,
    after_data: afterData,
    justification: justification ?? null,
  }

  const { error } = await supabase.from(AUDIT_TABLE).insert(payload)
  if (error) {
    console.warn('Falha ao registrar auditoria de recebimento:', error.message)
  }
}

export async function listPayments(filters = {}) {
  const { search = '', period = '', status = '', paymentMethod = '', financeModel = '', destination = '' } = filters
  let query = supabase.from(PAYMENT_TABLE).select('*').order('created_at', { ascending: false })

  if (search) {
    query = query.or(`notes.ilike.%${search}%,payment_date.ilike.%${search}%`)
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

  if (status) {
    query = query.eq('status', status)
  }

  if (paymentMethod) {
    query = query.eq('payment_method', paymentMethod)
  }

  if (financeModel) {
    query = query.ilike('notes', `%financeModel":"${financeModel}%`)
  }

  if (destination) {
    query = query.ilike('destination', `%${destination}%`)
  }

  const { data, error } = await query
  return { data: data ?? [], error }
}

export async function createPayment(payload) {
  const normalizedPayload = normalizePaymentPayload(payload)
  const { data, error } = await supabase.from(PAYMENT_TABLE).insert(normalizedPayload).select('*').single()

  if (!error && data) {
    await logPaymentAudit('CREATE', data.id, null, data, payload.justification ?? null)
  }

  return { data, error }
}

export async function updatePayment(id, payload) {
  const currentPayment = await getPaymentById(id)
  const normalizedPayload = normalizePaymentPayload(payload)
  const { data, error } = await supabase.from(PAYMENT_TABLE).update(normalizedPayload).eq('id', id).select('*').single()

  if (!error && data) {
    await logPaymentAudit('UPDATE', data.id, currentPayment.data, data, payload.justification ?? null)
  }

  return { data, error }
}

export async function cancelPayment(id, payload = {}) {
  const currentPayment = await getPaymentById(id)
  const { data, error } = await supabase.from(PAYMENT_TABLE).update({
    status: 'Cancelado',
    notes: serializeMetadata({
      ...(normalizeMetadata(currentPayment.data?.notes) || {}),
      cancelledAt: new Date().toISOString(),
      cancelledBy: payload.cancelled_by ?? null,
      cancellationReason: payload.cancellation_reason ?? null,
      originalStatus: currentPayment.data?.status ?? null,
    }),
  }).eq('id', id).select('*').single()

  if (!error && data) {
    await logPaymentAudit('CANCEL', data.id, currentPayment.data, data, payload.cancellation_reason ?? null)
  }

  return { data, error }
}

export async function getPaymentById(id) {
  const { data, error } = await supabase.from(PAYMENT_TABLE).select('*').eq('id', id).single()
  return { data, error }
}

export async function getLastConfirmedPartnerBeneficiary(vehicleId) {
  const { data, error } = await supabase.from(PAYMENT_TABLE).select('*').eq('vehicle_id', vehicleId)
  if (error) {
    return { data: null, error }
  }

  const confirmedPayments = (data ?? []).filter((payment) => payment.status !== 'Cancelado')
  const lastPayment = confirmedPayments.sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0))[0]
  const metadata = normalizeMetadata(lastPayment?.notes)

  return { data: metadata?.beneficiary || null, error: null }
}

export async function calculateNextPartnerBeneficiaryForVehicle(vehicleId, vehicleNextDestination) {
  const { data: lastBeneficiary, error } = await getLastConfirmedPartnerBeneficiary(vehicleId)
  if (error) {
    return { data: null, error }
  }

  const nextBeneficiary = calculateNextPartnerBeneficiary(lastBeneficiary || vehicleNextDestination)
  return { data: nextBeneficiary, error: null }
}

export async function createPaymentWithDestinationRules(payload) {
  const { data: vehicle } = await supabase.from('vehicles').select('id,next_destination,finance_model').eq('id', payload.vehicle_id).single()
  const { data: nextBeneficiary } = await calculateNextPartnerBeneficiaryForVehicle(payload.vehicle_id, vehicle?.next_destination)

  const paymentPayload = {
    ...payload,
    beneficiary: payload.finance_model === 'savings' ? null : nextBeneficiary,
    destination: payload.finance_model === 'savings' ? 'Fundo do veículo' : payload.destination,
    finance_model: payload.finance_model,
  }

  return createPayment(paymentPayload)
}

export async function updateVehicleNextDestination(vehicleId, nextDestination) {
  if (!vehicleId) {
    return null
  }

  const { data, error } = await supabase.from('vehicles').update({ next_destination: nextDestination }).eq('id', vehicleId).select('*').single()
  return { data, error }
}

export async function calculateNextPaymentDueDate(currentDueDate, fallbackDate) {
  return calculateNextDueDate(currentDueDate, fallbackDate)
}
