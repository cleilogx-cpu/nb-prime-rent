import { supabase } from '../lib/supabaseClient.js'
import { findOrCreateTenant } from './tenantsService.js'
import {
  addMonthsToDate,
  deriveWeeksFromDates,
  generateContractNumber,
  validateContractDates,
} from '../lib/contractLogic.js'
import { PERIODICITY, VEHICLE_STATUS } from '../lib/constants.js'

const TABLE = 'contracts'

const CONTRACT_SELECT = '*, tenants(*), vehicles(*)'

/**
 * O prazo do contrato é escolhido em MESES na tela (1, 2, 3, 6, 12...) e
 * usa meses de calendário (addMonthsToDate/addMonthsClamped) -- é um eixo
 * independente da periodicidade do pagamento (diária/semanal/quinzenal/
 * mensal). Aqui a gente resolve os dois formatos de prazo:
 * - se vier `duration_months`, calcula a data final a partir dele (pode ser
 *   ajustada manualmente depois via `end_date`);
 * - se vier `end_date` direto (ex: usuário editou a data manualmente), usa
 *   ela como está;
 * - `weeks` sempre é derivado das datas finais -- é só a duração total do
 *   contrato em semanas (usada na cláusula de vigência do documento), não
 *   tem relação com a periodicidade do pagamento.
 */
function resolveContractDates(payload) {
  const startDate = payload.start_date
  const endDate = payload.end_date || addMonthsToDate(startDate, payload.duration_months)
  const weeks = deriveWeeksFromDates(startDate, endDate)

  return { startDate, endDate, weeks }
}

function normalizeContractPayload(payload) {
  const { startDate, endDate, weeks } = resolveContractDates(payload)

  return {
    vehicle_id: payload.vehicle_id,
    tenant_id: payload.tenant_id,
    start_date: startDate,
    end_date: endDate,
    weeks,
    periodicity: payload.periodicity || PERIODICITY.WEEKLY,
    payment_amount: Number(payload.payment_amount || 0),
    deposit_amount: Number(payload.deposit_amount || 0),
    initial_km: payload.initial_km === '' || payload.initial_km === null || payload.initial_km === undefined
      ? null
      : Number(payload.initial_km),
    billing_day: payload.billing_day || null,
    finance_model: payload.finance_model || 'partners',
    observations: payload.observations || null,
    clauses: payload.clauses || null,
  }
}

export async function listContracts(filters = {}) {
  const { search = '', status = '' } = filters

  let query = supabase.from(TABLE).select(CONTRACT_SELECT).order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], error }
  }

  const filtered = search
    ? data.filter((contract) => {
        const haystack = [
          contract.contract_number,
          contract.tenants?.full_name,
          contract.vehicles?.plate,
          contract.vehicles?.model,
        ].join(' ').toLowerCase()
        return haystack.includes(search.toLowerCase())
      })
    : data

  return { data: filtered, error: null }
}

export async function getContractById(id) {
  const { data, error } = await supabase.from(TABLE).select(CONTRACT_SELECT).eq('id', id).single()

  return { data, error }
}

/**
 * Cria o contrato como Rascunho. O locatário é criado/atualizado (por CPF)
 * na mesma chamada, então esta função recebe payload.tenant com os dados
 * digitados na hora, além dos dados do próprio contrato.
 */
export async function createContract(payload) {
  const { startDate, endDate } = resolveContractDates(payload)

  const validationError = validateContractDates(startDate, endDate)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const { data: tenant, error: tenantError } = await findOrCreateTenant(payload.tenant || {})
  if (tenantError) {
    return { data: null, error: tenantError }
  }

  const normalizedPayload = normalizeContractPayload({ ...payload, tenant_id: tenant.id })

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...normalizedPayload,
      contract_number: generateContractNumber(new Date().getFullYear()),
      status: 'Rascunho',
    })
    .select(CONTRACT_SELECT)
    .single()

  return { data, error }
}

export async function updateContract(id, payload) {
  const normalizedPayload = normalizeContractPayload(payload)

  const { data, error } = await supabase
    .from(TABLE)
    .update(normalizedPayload)
    .eq('id', id)
    .eq('status', 'Rascunho')
    .select(CONTRACT_SELECT)
    .single()

  return { data, error }
}

async function setVehicleStatus(vehicleId, status) {
  const { error } = await supabase.from('vehicles').update({ status }).eq('id', vehicleId)

  if (error) {
    console.warn('Falha ao sincronizar status do veículo:', error.message)
  }
}

/**
 * Marca o contrato como assinado (Ativo). Isso automaticamente:
 * 1. cria a locação (rentals) ligada a este contrato;
 * 2. muda o veículo para "Alugado".
 * Não permite assinar dois contratos ativos para o mesmo veículo ao mesmo tempo.
 */
export async function signContract(id, { signed_document_url } = {}) {
  const { data: contract, error: fetchError } = await getContractById(id)
  if (fetchError || !contract) {
    return { data: null, error: fetchError || { message: 'Contrato não encontrado.' } }
  }

  if (contract.status === 'Ativo') {
    return { data: null, error: { message: 'Este contrato já está ativo.' } }
  }

  const { data: existingActiveRental } = await supabase
    .from('rentals')
    .select('id')
    .eq('vehicle_id', contract.vehicle_id)
    .eq('status', 'Ativa')
    .maybeSingle()

  if (existingActiveRental) {
    return { data: null, error: { message: 'Este veículo já tem uma locação ativa. Encerre-a antes de assinar um novo contrato.' } }
  }

  const { data: rental, error: rentalError } = await supabase
    .from('rentals')
    .insert({
      contract_id: contract.id,
      vehicle_id: contract.vehicle_id,
      tenant_id: contract.tenant_id,
      start_date: contract.start_date,
      expected_end_date: contract.end_date,
      initial_km: contract.initial_km,
      payment_amount: contract.payment_amount,
      periodicity: contract.periodicity,
      status: 'Ativa',
    })
    .select('*')
    .single()

  if (rentalError) {
    return { data: null, error: rentalError }
  }

  const { data: updatedContract, error: updateError } = await supabase
    .from(TABLE)
    .update({
      status: 'Ativo',
      rental_id: rental.id,
      signed_document_url: signed_document_url || contract.signed_document_url,
    })
    .eq('id', id)
    .select(CONTRACT_SELECT)
    .single()

  if (updateError) {
    return { data: null, error: updateError }
  }

  await setVehicleStatus(contract.vehicle_id, VEHICLE_STATUS.ALUGADO)

  return { data: updatedContract, error: null }
}

export async function cancelContract(id, payload = {}) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: 'Cancelado',
      observations: payload.reason
        ? `Cancelado: ${payload.reason}`
        : undefined,
    })
    .eq('id', id)
    .select(CONTRACT_SELECT)
    .single()

  return { data, error }
}
