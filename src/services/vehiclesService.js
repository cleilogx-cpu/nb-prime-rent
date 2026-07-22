import { supabase } from '../lib/supabaseClient.js'

const AUDIT_TABLE = 'audit_logs'

function normalizePayload(payload) {
  return {
    plate: payload.plate?.trim().toUpperCase() ?? null,
    model: payload.model?.trim() ?? null,
    color: payload.color?.trim() ?? null,
    tenant_name: payload.tenant_name?.trim() ?? null,
    tenant_phone: payload.tenant_phone?.trim() ?? null,
    weekly_rent: payload.weekly_rent === '' || payload.weekly_rent === null || payload.weekly_rent === undefined
      ? null
      : Number(payload.weekly_rent),
    finance_model: payload.finance_model?.trim() ?? null,
    next_payment: payload.next_payment ? payload.next_payment : null,
    next_destination: payload.finance_model === 'savings' ? 'Poupança' : (payload.next_destination?.trim() || null),
    deposit_expected: payload.deposit_expected === '' || payload.deposit_expected === null || payload.deposit_expected === undefined
      ? null
      : Number(payload.deposit_expected),
    deposit_received: payload.deposit_received === '' || payload.deposit_received === null || payload.deposit_received === undefined
      ? null
      : Number(payload.deposit_received),
    deposit_expenses: payload.deposit_expenses === '' || payload.deposit_expenses === null || payload.deposit_expenses === undefined
      ? null
      : Number(payload.deposit_expenses),
    current_km: payload.current_km === '' || payload.current_km === null || payload.current_km === undefined
      ? null
      : Number(payload.current_km),
    next_review_km: payload.next_review_km === '' || payload.next_review_km === null || payload.next_review_km === undefined
      ? null
      : Number(payload.next_review_km),
    status: payload.status?.trim() ?? null,
  }
}

async function getCurrentUserId() {
  const { data: userData, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }

  return userData?.user?.id ?? null
}

async function logVehicleAudit(action, entityId, beforeData, afterData) {
  const userId = await getCurrentUserId()

  const payload = {
    action,
    entity: 'vehicles',
    entity_id: entityId,
    user_id: userId,
    before_data: beforeData,
    after_data: afterData,
  }

  const { error } = await supabase.from(AUDIT_TABLE).insert(payload)

  if (error) {
    console.warn('Falha ao registrar auditoria do veículo:', error.message)
  }
}

export async function listVehicles(filters = {}) {
  const { search = '', status = '', financeModel = '' } = filters

  let query = supabase.from('vehicles').select('*')

  if (search) {
    query = query.or(`plate.ilike.%${search}%,model.ilike.%${search}%,tenant_name.ilike.%${search}%`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (financeModel) {
    query = query.eq('finance_model', financeModel)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  return { data, error }
}

export async function getVehicleById(id) {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single()

  return { data, error }
}

export async function createVehicle(payload) {
  const normalizedPayload = normalizePayload(payload)

  const { data, error } = await supabase.from('vehicles').insert(normalizedPayload).select('*').single()

  if (!error && data) {
    await logVehicleAudit('CREATE', data.id, null, data)
  }

  return { data, error }
}

export async function updateVehicle(id, payload) {
  const currentVehicle = await getVehicleById(id)
  const normalizedPayload = normalizePayload(payload)

  const { data, error } = await supabase.from('vehicles').update(normalizedPayload).eq('id', id).select('*').single()

  if (!error && data) {
    await logVehicleAudit('UPDATE', data.id, currentVehicle.data, data)
  }

  return { data, error }
}

export async function deleteVehicle(id) {
  const currentVehicle = await getVehicleById(id)

  const { data, error } = await supabase.from('vehicles').delete().eq('id', id).select('*').single()

  if (!error && data) {
    await logVehicleAudit('DELETE', id, currentVehicle.data, null)
  }

  return { data, error }
}
