import { supabase } from '../lib/supabaseClient.js'
import { calculateNextPaymentDate } from './locationLogic.js'

const STORAGE_KEY = 'nb_prime_rent_locations_v1'

function readLocations() {
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
    console.warn('Falha ao ler locações salvas localmente:', error)
    return []
  }
}

function writeLocations(locations) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(locations))
}

function normalizeStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase()

  if (['active', 'ativa', 'ativo'].includes(normalized)) {
    return 'Ativa'
  }

  if (['finished', 'finalizada', 'finalizado'].includes(normalized)) {
    return 'Finalizada'
  }

  if (['cancelled', 'cancelada', 'canceled', 'cancelado'].includes(normalized)) {
    return 'Cancelada'
  }

  return status || 'Ativa'
}

async function syncVehicleStatus(vehicleId, status) {
  if (!vehicleId) {
    return
  }

  try {
    await supabase.from('vehicles').update({ status }).eq('id', vehicleId)
  } catch (error) {
    console.warn('Falha ao sincronizar status do veículo para locações:', error)
  }
}

export async function listLocations() {
  return readLocations().sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0))
}

export async function createLocation(payload) {
  const existingLocations = readLocations()
  const activeLocations = existingLocations.filter((location) => normalizeStatus(location.status) === 'Ativa')
  const hasActiveLocation = activeLocations.some((location) => location.vehicle_id === payload.vehicle_id)

  if (hasActiveLocation) {
    return {
      data: null,
      error: { message: 'Este veículo já possui uma locação ativa.' },
    }
  }

  const nextPayment = calculateNextPaymentDate(payload.start_date)

  const newLocation = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    vehicle_id: payload.vehicle_id,
    vehicle_plate: payload.vehicle_plate,
    vehicle_model: payload.vehicle_model,
    tenant_name: payload.tenant_name,
    start_date: payload.start_date,
    weekly_rent: Number(payload.weekly_rent || 0),
    deposit: Number(payload.deposit || 0),
    weeks: Number(payload.weeks || 0),
    observations: payload.observations,
    finance_model: payload.finance_model,
    next_payment: nextPayment,
    status: 'Ativa',
    created_at: new Date().toISOString(),
  }

  const nextLocations = [newLocation, ...existingLocations]
  writeLocations(nextLocations)

  await syncVehicleStatus(payload.vehicle_id, 'ALUGADO')

  return { data: newLocation, error: null }
}

export async function updateLocation(id, payload) {
  const existingLocations = readLocations()
  const nextLocations = existingLocations.map((location) => {
    if (location.id !== id) {
      return location
    }

    const nextPayment = calculateNextPaymentDate(payload.start_date || location.start_date)

    return {
      ...location,
      ...payload,
      weekly_rent: Number(payload.weekly_rent ?? location.weekly_rent ?? 0),
      deposit: Number(payload.deposit ?? location.deposit ?? 0),
      weeks: Number(payload.weeks ?? location.weeks ?? 0),
      next_payment: nextPayment,
      status: normalizeStatus(payload.status || location.status),
    }
  })

  writeLocations(nextLocations)
  return { data: nextLocations.find((location) => location.id === id) || null, error: null }
}

export async function endLocation(id) {
  const existingLocations = readLocations()
  const targetLocation = existingLocations.find((location) => location.id === id)

  if (!targetLocation) {
    return { data: null, error: { message: 'Locação não encontrada.' } }
  }

  const nextLocations = existingLocations.map((location) => {
    if (location.id !== id) {
      return location
    }

    return {
      ...location,
      status: 'Finalizada',
      next_payment: location.next_payment,
    }
  })

  writeLocations(nextLocations)
  await syncVehicleStatus(targetLocation.vehicle_id, 'Disponível')

  return { data: nextLocations.find((location) => location.id === id) || null, error: null }
}
