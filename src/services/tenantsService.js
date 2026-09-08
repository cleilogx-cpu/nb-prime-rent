import { supabase } from '../lib/supabaseClient.js'

const TABLE = 'tenants'

// `address` (campo único, livre) é mantido só como legado de exibição pros
// locatários cadastrados antes desta separação — nunca mais é preenchido a
// partir daqui. Contratos novos sempre gravam os 7 campos estruturados;
// quem lê o endereço pra exibir/imprimir usa formatTenantAddress
// (src/lib/format.js), que cai pro campo antigo só se os novos vierem vazios.
function normalizeTenantPayload(payload) {
  return {
    full_name: payload.full_name?.trim() ?? null,
    cpf: payload.cpf?.trim() ?? null,
    rg: payload.rg?.trim() ?? null,
    phone: payload.phone?.trim() ?? null,
    whatsapp: payload.whatsapp?.trim() || payload.phone?.trim() || null,
    email: payload.email?.trim() ?? null,
    address_street: payload.address_street?.trim() ?? null,
    address_number: payload.address_number?.trim() ?? null,
    address_neighborhood: payload.address_neighborhood?.trim() ?? null,
    address_zip: payload.address_zip?.trim() ?? null,
    address_complement: payload.address_complement?.trim() ?? null,
    address_city: payload.address_city?.trim() ?? null,
    address_state: payload.address_state?.trim().toUpperCase() ?? null,
    cnh_number: payload.cnh_number?.trim() ?? null,
    cnh_validity: payload.cnh_validity || null,
    pix_key: payload.pix_key?.trim() ?? null,
    observations: payload.observations?.trim() ?? null,
  }
}

export async function listTenants(filters = {}) {
  const { search = '' } = filters

  let query = supabase.from(TABLE).select('*').eq('status', 'active')

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,cpf.ilike.%${search}%`)
  }

  const { data, error } = await query.order('full_name', { ascending: true })

  return { data, error }
}

export async function getTenantById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()

  return { data, error }
}

export async function createTenant(payload) {
  const normalizedPayload = normalizeTenantPayload(payload)

  const { data, error } = await supabase.from(TABLE).insert(normalizedPayload).select('*').single()

  return { data, error }
}

export async function updateTenant(id, payload) {
  const normalizedPayload = normalizeTenantPayload(payload)

  const { data, error } = await supabase.from(TABLE).update(normalizedPayload).eq('id', id).select('*').single()

  return { data, error }
}

/**
 * Cria o locatário se ele ainda não existir (por CPF) e devolve o id.
 * Usado no fluxo de criação de contrato, onde o locatário é digitado na hora.
 */
export async function findOrCreateTenant(payload) {
  const cpf = payload.cpf?.trim()

  if (cpf) {
    const { data: existing, error: searchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('cpf', cpf)
      .maybeSingle()

    if (searchError) {
      return { data: null, error: searchError }
    }

    if (existing) {
      return updateTenant(existing.id, payload)
    }
  }

  return createTenant(payload)
}
