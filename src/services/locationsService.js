import { supabase } from '../lib/supabaseClient.js'
import { markDepositPendingRefund } from './depositsService.js'
import { CHARGE_STATUS } from '../lib/constants.js'

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

/**
 * Encerra uma locação: marca a locação como "Encerrada" (com data real de
 * encerramento, km final e avaliação do locatário), libera o veículo
 * ("Disponível" de novo) e marca o contrato ligado como "Encerrado" —
 * é isso que faz o contrato aparecer no Histórico.
 */
export async function endLocation(id, payload) {
  const { data: rental, error: fetchError } = await getLocationById(id)
  if (fetchError || !rental) {
    return { data: null, error: fetchError || { message: 'Locação não encontrada.' } }
  }

  if (rental.status !== 'Ativa') {
    return { data: null, error: { message: 'Esta locação já está encerrada.' } }
  }

  const { data: updatedRental, error: updateError } = await supabase
    .from(TABLE)
    .update({
      status: 'Encerrada',
      actual_end_date: payload.actual_end_date,
      final_km: payload.final_km === '' || payload.final_km === null || payload.final_km === undefined
        ? null
        : Number(payload.final_km),
      tenant_rating: payload.tenant_rating || null,
      closing_notes: payload.closing_notes || null,
    })
    .eq('id', id)
    .select(RENTAL_SELECT)
    .single()

  if (updateError) {
    return { data: null, error: updateError }
  }

  const { error: vehicleError } = await supabase
    .from('vehicles')
    .update({ status: 'Disponível' })
    .eq('id', rental.vehicle_id)

  if (vehicleError) {
    console.warn('Falha ao liberar o veículo após encerrar a locação:', vehicleError.message)
  }

  if (rental.contract_id) {
    const { error: contractError } = await supabase
      .from('contracts')
      .update({ status: 'Encerrado' })
      .eq('id', rental.contract_id)

    if (contractError) {
      console.warn('Falha ao marcar o contrato como encerrado:', contractError.message)
    }

    // Se algum valor de caução foi efetivamente recebido, ela passa a
    // precisar de devolução. Se nunca recebeu nada, fica como estava.
    const { error: depositError } = await markDepositPendingRefund(rental.contract_id)
    if (depositError) {
      console.warn('Falha ao atualizar o status da caução para devolução:', depositError.message)
    }

    // Encerramento (no prazo ou antecipado): cobranças futuras que ainda
    // não venceram (due_date posterior à data efetiva de encerramento) não
    // fazem mais sentido -- sem isso, elas ficariam "Pendente" pra sempre
    // e, quando a data passasse, apareceriam como atrasadas de uma locação
    // que já acabou. Não apaga a linha (mantém rastreabilidade pro
    // Histórico), só marca como "Cancelada por encerramento da locação".
    // O que já venceu (due_date <= actual_end_date) fica intocado, pago ou
    // não -- é passado e não é este fluxo que decide isso.
    // listUpcomingCharges/listOverdueCharges também têm proteção redundante
    // (só consideram locação/contrato ativos), mas este update é a primeira
    // linha de defesa.
    const { error: chargesError } = await supabase
      .from('contract_charges')
      .update({ status: CHARGE_STATUS.CANCELADA_ENCERRAMENTO })
      .eq('contract_id', rental.contract_id)
      .eq('status', CHARGE_STATUS.PENDENTE)
      .gt('due_date', payload.actual_end_date)

    if (chargesError) {
      console.warn('Falha ao cancelar as cobranças futuras da locação encerrada:', chargesError.message)
    }
  }

  return { data: updatedRental, error: null }
}
