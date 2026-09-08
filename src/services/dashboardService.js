import { supabase } from '../lib/supabaseClient.js'

export async function fetchDashboardData() {
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id,plate,model,color,current_km,status')
    .order('created_at', { ascending: false })
    .limit(8)

  if (vehiclesError) {
    return { data: null, error: vehiclesError }
  }

  // Observação: o Dashboard somava da tabela antiga `payments` (que já não
  // recebe gravações — a tela de Recebimentos usa `rental_payments` desde a
  // migração para contratos/locações), então os totais aqui nunca batiam com
  // os de Recebimentos. Agora lê da mesma tabela `rental_payments`.
  const { data: payments, error: paymentsError } = await supabase
    .from('rental_payments')
    .select('amount,is_cancelled,destination,created_at,payment_date')

  if (paymentsError) {
    return { data: null, error: paymentsError }
  }

  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount')

  if (expensesError) {
    return { data: null, error: expensesError }
  }

  const paymentsTotal = payments.reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const expensesTotal = expenses.reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const confirmedPayments = (payments ?? []).filter((payment) => !payment.is_cancelled)
  const totalPaidThisMonth = confirmedPayments.filter((payment) => {
    const paymentDate = payment.payment_date || payment.created_at
    if (!paymentDate) {
      return false
    }
    const parsedDate = new Date(paymentDate)
    const now = new Date()
    return parsedDate.getMonth() === now.getMonth() && parsedDate.getFullYear() === now.getFullYear()
  }).reduce((acc, item) => acc + Number(item.amount ?? 0), 0)

  const totalCancelled = (payments ?? []).filter((payment) => payment.is_cancelled).reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const totalClei = confirmedPayments.filter((payment) => payment.destination === 'Clei').reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const totalEdson = confirmedPayments.filter((payment) => payment.destination === 'Edson').reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const totalFunds = confirmedPayments.filter((payment) => payment.destination === 'Fundo do veículo').reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const nextDuePayments = confirmedPayments.filter((payment) => payment.payment_date).length
  // `rental_payments` só distingue Pago/Cancelado (`is_cancelled`) — não existe
  // ainda um status "Atrasado" gravado no banco (a tela de Recebimentos também
  // não calcula isso hoje), então este contador fica em 0 até esse conceito
  // ser implementado de verdade.
  const latePayments = 0

  const rentedCount = (vehicles ?? []).filter((vehicle) => {
    const status = String(vehicle.status ?? '').toLowerCase()
    return status && status !== 'disponível' && status !== 'available'
  }).length

  const availableCount = (vehicles ?? []).filter((vehicle) => {
    const status = String(vehicle.status ?? '').toLowerCase()
    return status === 'disponível' || status === 'available'
  }).length

  // Observação: os contadores por sócio/fundo saíram daqui porque o campo
  // finance_model deixou de existir em `vehicles`. Isso volta quando o
  // dashboard passar a ler de `contracts`/`rentals` (próxima fase).
  const maintenanceCount = (vehicles ?? []).filter((vehicle) => String(vehicle.status ?? '').toLowerCase() === 'manutenção').length

  return {
    data: {
      vehicles: vehicles ?? [],
      paymentsTotal,
      expensesTotal,
      totalPaidThisMonth,
      totalCancelled,
      totalClei,
      totalEdson,
      totalFunds,
      nextDuePayments,
      latePayments,
      rentedCount,
      availableCount,
      maintenanceCount,
    },
    error: null,
  }
}
