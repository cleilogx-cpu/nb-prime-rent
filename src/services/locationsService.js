import { supabase } from '../lib/supabaseClient.js'

const TABLE = 'rentals'
const RENTAL_SELECT = '*, tenants(*), vehicles(*), contracts(contract_number, finance_model)'

/**
 * Locações agora nascem sozinhas quando um contrato é assinado
 * (contractsService.signContract). Este serviço só lê o que já existe —
 * não há mais criação manual de locação.
 */
export async function listActiveLocations(filters = {}) {
  const { search = '' } = filters

  let query = supabase.from(TABLE).select(RENTAL_SELECT).eq('status', 'Ativa').order('start_date', { ascending: false })

  const { data, error } = await query

  if (error) {
    return { data: [], error }
  }

  const filtered = search
    ? data.filter((rental) => {
        const haystack = [
          rental.vehicles?.plate,
          rental.vehicles?.model,
          rental.tenants?.full_name,
        ].join(' ').toLowerCase()
        return haystack.includes(search.toLowerCase())
      })
    : data

  return { data: filtered, error: null }
}

export async function listLocationHistory() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(RENTAL_SELECT)
    .in('status', ['Encerrada', 'Cancelada'])
    .order('actual_end_date', { ascending: false })

  return { data: data ?? [], error }
}

export async function getLocationById(id) {
  const { data, error } = await supabase.from(TABLE).select(RENTAL_SELECT).eq('id', id).single()

  return { data, error }
}
