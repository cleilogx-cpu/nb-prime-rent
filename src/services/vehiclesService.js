import { supabase } from '../lib/supabaseClient.js'
import { VEHICLE_STATUS } from '../lib/constants.js'

const AUDIT_TABLE = 'audit_logs'

/**
 * `status` NUNCA é aceito aqui como escolha livre — "Alugado" só é escrito
 * por contractsService.signContract / locationsService.endLocation. O
 * formulário de veículo não manda mais `status` no payload (só `maintenance`,
 * que é independente); se por algum motivo vier um `status` explícito
 * (ex: um caller interno), ele é ignorado — quem quiser mudar o status bruto
 * de verdade usa os serviços de contrato/locação, não este normalizador.
 */
function normalizePayload(payload) {
  return {
    plate: payload.plate?.trim().toUpperCase() ?? null,
    model: payload.model?.trim() ?? null,
    color: payload.color?.trim() ?? null,
    year: payload.year === '' || payload.year === null || payload.year === undefined
      ? null
      : Number(payload.year),
    chassis: payload.chassis?.trim().toUpperCase() ?? null,
    current_km: payload.current_km === '' || payload.current_km === null || payload.current_km === undefined
      ? null
      : Number(payload.current_km),
    next_review_km: payload.next_review_km === '' || payload.next_review_km === null || payload.next_review_km === undefined
      ? null
      : Number(payload.next_review_km),
    maintenance: Boolean(payload.maintenance),
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

/**
 * "Manutenção" filtra pela coluna independente `maintenance` (um veículo
 * alugado em manutenção também aparece aqui). "Disponível" e "Alugado"
 * continuam filtrando pela coluna `status`, mas "Disponível" também exige
 * `maintenance = false` — senão um veículo em manutenção apareceria como
 * "disponível" pra alugar.
 */
export async function listVehicles(filters = {}) {
  const { search = '', status = '' } = filters

  let query = supabase.from('vehicles').select('*')

  if (search) {
    query = query.or(`plate.ilike.%${search}%,model.ilike.%${search}%`)
  }

  if (status === 'Manutenção') {
    query = query.eq('maintenance', true)
  } else if (status === VEHICLE_STATUS.DISPONIVEL) {
    query = query.eq('status', VEHICLE_STATUS.DISPONIVEL).eq('maintenance', false)
  } else if (status === VEHICLE_STATUS.ALUGADO) {
    query = query.eq('status', VEHICLE_STATUS.ALUGADO)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  return { data, error }
}

export async function getVehicleById(id) {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single()

  return { data, error }
}

export async function createVehicle(payload) {
  // Todo veículo novo nasce "Disponível" — vira "Alugado" só quando um
  // contrato for assinado (contractsService.signContract).
  const normalizedPayload = { ...normalizePayload(payload), status: VEHICLE_STATUS.DISPONIVEL }

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
