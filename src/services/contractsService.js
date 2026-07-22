import { buildContractStatus, calculateContractEndDate, cloneContractForRenewal, generateContractNumber, validateContractDates } from '../lib/contractLogic.js'

const STORAGE_KEY = 'nb_prime_rent_contracts_v1'

function readContracts() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    if (!storedValue) {
      return []
    }
    const parsedValue = JSON.parse(storedValue)
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch (error) {
    console.warn('Falha ao ler contratos locais:', error)
    return []
  }
}

function writeContracts(contracts) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
}

export async function listContracts() {
  return readContracts().sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0))
}

export async function createContract(payload) {
  const validationError = validateContractDates(payload.start_date, payload.end_date)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const normalizedPayload = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    contract_number: payload.contract_number || generateContractNumber(new Date().getFullYear()),
    location_id: payload.location_id || null,
    vehicle_id: payload.vehicle_id || null,
    vehicle_plate: payload.vehicle_plate || null,
    vehicle_model: payload.vehicle_model || null,
    vehicle_color: payload.vehicle_color || null,
    tenant_name: payload.tenant_name || null,
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
    weekly_rent: Number(payload.weekly_rent || 0),
    deposit: Number(payload.deposit || 0),
    weeks: Number(payload.weeks || 0),
    billing_day: payload.billing_day || null,
    finance_model: payload.finance_model || 'partners',
    observations: payload.observations || '',
    clauses: payload.clauses || '',
    responsible_name: payload.responsible_name || 'Sistema',
    status: buildContractStatus(payload.status, payload.end_date),
    created_at: new Date().toISOString(),
    history: payload.history || [],
    metadata: {
      createdInCompatMode: true,
      migrationNote: 'Este armazenamento local será migrado para Supabase quando a tabela contracts existir.',
      parentContractId: payload.parent_contract_id || null,
      legalReviewWarning: 'Este modelo deve ser revisado por profissional jurídico antes do uso oficial.',
    },
  }

  const nextContracts = [normalizedPayload, ...readContracts()]
  writeContracts(nextContracts)
  return { data: normalizedPayload, error: null }
}

export async function updateContract(id, payload) {
  const existingContracts = readContracts()
  const nextContracts = existingContracts.map((contract) => {
    if (contract.id !== id) {
      return contract
    }

    return {
      ...contract,
      ...payload,
      status: buildContractStatus(payload.status || contract.status, payload.end_date || contract.end_date),
      end_date: payload.end_date || contract.end_date,
      weekly_rent: Number(payload.weekly_rent ?? contract.weekly_rent ?? 0),
      deposit: Number(payload.deposit ?? contract.deposit ?? 0),
      weeks: Number(payload.weeks ?? contract.weeks ?? 0),
      history: payload.history || contract.history || [],
    }
  })

  writeContracts(nextContracts)
  return { data: nextContracts.find((contract) => contract.id === id) || null, error: null }
}

export async function renewContract(id, payload) {
  const existingContracts = readContracts()
  const originalContract = existingContracts.find((contract) => contract.id === id)
  if (!originalContract) {
    return { data: null, error: { message: 'Contrato não encontrado.' } }
  }

  const renewedContract = {
    ...cloneContractForRenewal(originalContract),
    ...payload,
    contract_number: payload.contract_number || generateContractNumber(new Date().getFullYear()),
    start_date: payload.start_date || originalContract.start_date,
    end_date: payload.end_date || calculateContractEndDate(payload.start_date || originalContract.start_date, payload.weeks || originalContract.weeks),
    weekly_rent: Number(payload.weekly_rent ?? originalContract.weekly_rent ?? 0),
    deposit: Number(payload.deposit ?? originalContract.deposit ?? 0),
    history: payload.history || cloneContractForRenewal(originalContract).history,
    metadata: {
      ...(originalContract.metadata || {}),
      parentContractId: originalContract.id,
      renewalNote: 'Renovação criada a partir do contrato anterior.',
    },
  }

  const nextContracts = [renewedContract, ...existingContracts]
  writeContracts(nextContracts)
  return { data: renewedContract, error: null }
}

export async function endContract(id, payload = {}) {
  const existingContracts = readContracts()
  const targetContract = existingContracts.find((contract) => contract.id === id)
  if (!targetContract) {
    return { data: null, error: { message: 'Contrato não encontrado.' } }
  }

  const nextContracts = existingContracts.map((contract) => {
    if (contract.id !== id) {
      return contract
    }
    return {
      ...contract,
      status: 'Encerrado',
      end_date: payload.end_date || contract.end_date,
      observation: payload.observations || contract.observations,
      history: [
        ...(contract.history || []),
        { action: 'Encerrado', at: new Date().toISOString(), note: payload.observations || '' },
      ],
    }
  })

  writeContracts(nextContracts)
  return { data: nextContracts.find((contract) => contract.id === id) || null, error: null }
}

export async function cancelContract(id, payload = {}) {
  const existingContracts = readContracts()
  const targetContract = existingContracts.find((contract) => contract.id === id)
  if (!targetContract) {
    return { data: null, error: { message: 'Contrato não encontrado.' } }
  }

  const nextContracts = existingContracts.map((contract) => {
    if (contract.id !== id) {
      return contract
    }
    return {
      ...contract,
      status: 'Cancelado',
      history: [
        ...(contract.history || []),
        { action: 'Cancelado', at: new Date().toISOString(), note: payload.reason || '' },
      ],
    }
  })

  writeContracts(nextContracts)
  return { data: nextContracts.find((contract) => contract.id === id) || null, error: null }
}

export async function getContractById(id) {
  const contracts = readContracts()
  return { data: contracts.find((contract) => contract.id === id) || null, error: null }
}
