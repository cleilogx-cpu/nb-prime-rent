import { supabase } from '../lib/supabaseClient.js'
import { summarizeVehicleStatuses } from '../lib/vehicleStatus.js'
import { computePaymentTotals } from '../lib/paymentAggregation.js'
import { listUpcomingCharges, listOverdueCharges } from './chargesService.js'

/**
 * Visão Geral: status da frota + próximos vencimentos/atrasados
 * (`contract_charges`, persistido de verdade desde o PR3 -- antes disso
 * não existia como calcular isso).
 */
export async function fetchOverviewData() {
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id,plate,model,color,current_km,status,maintenance')
    .order('created_at', { ascending: false })
    .limit(8)

  if (vehiclesError) {
    return { data: null, error: vehiclesError }
  }

  const { data: allVehicles, error: allVehiclesError } = await supabase
    .from('vehicles')
    .select('status,maintenance')

  if (allVehiclesError) {
    return { data: null, error: allVehiclesError }
  }

  const [{ data: upcomingCharges, error: upcomingError }, { data: overdueCharges, error: overdueError }] = await Promise.all([
    listUpcomingCharges(),
    listOverdueCharges(),
  ])

  if (upcomingError) {
    return { data: null, error: upcomingError }
  }

  if (overdueError) {
    return { data: null, error: overdueError }
  }

  const { rentedCount, availableCount, maintenanceCount } = summarizeVehicleStatuses(allVehicles)

  return {
    data: {
      vehicles: vehicles ?? [],
      rentedCount,
      availableCount,
      maintenanceCount,
      upcomingCharges: upcomingCharges ?? [],
      overdueCharges: overdueCharges ?? [],
    },
    error: null,
  }
}

/**
 * Recebimentos + despesas crus (sem filtro) pro Resumo Financeiro do
 * Dashboard -- busca uma vez só e recalcula no cliente com
 * `computePaymentTotals` a cada troca de mês/ano/veículo, sem refazer a
 * consulta ao Supabase a cada clique no filtro.
 */
export async function fetchFinancialRawData() {
  const [{ data: payments, error: paymentsError }, { data: expenses, error: expensesError }] = await Promise.all([
    supabase.from('rental_payments').select('vehicle_id,amount,is_cancelled,destination,payment_date'),
    supabase.from('expenses').select('vehicle_id,amount,expense_date'),
  ])

  if (paymentsError) {
    return { data: null, error: paymentsError }
  }

  if (expensesError) {
    return { data: null, error: expensesError }
  }

  return { data: { payments: payments ?? [], expenses: expenses ?? [] }, error: null }
}

/**
 * Resumo Financeiro: recebimentos/despesas/resultado bruto do período
 * (mês/ano/veículo escolhidos), via a mesma `computePaymentTotals` que
 * Recebimentos usa -- os números batem entre as duas telas.
 */
export async function fetchFinancialSummary({ periodStart, periodEnd, vehicleId } = {}) {
  const { data, error } = await fetchFinancialRawData()

  if (error) {
    return { data: null, error }
  }

  const totals = computePaymentTotals({ payments: data.payments, expenses: data.expenses, periodStart, periodEnd, vehicleId })

  return { data: totals, error: null }
}
