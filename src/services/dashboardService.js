import { supabase } from '../lib/supabaseClient.js'

export async function fetchDashboardData() {
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id,plate,model,color,tenant_name,weekly_rent,next_payment,status,finance_model')
    .order('created_at', { ascending: false })
    .limit(8)

  if (vehiclesError) {
    return { data: null, error: vehiclesError }
  }

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount,status,destination,created_at,payment_date')

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
  const confirmedPayments = (payments ?? []).filter((payment) => payment.status !== 'Cancelado')
  const totalPaidThisMonth = confirmedPayments.filter((payment) => {
    const paymentDate = payment.payment_date || payment.created_at
    if (!paymentDate) {
      return false
    }
    const parsedDate = new Date(paymentDate)
    const now = new Date()
    return parsedDate.getMonth() === now.getMonth() && parsedDate.getFullYear() === now.getFullYear()
  }).reduce((acc, item) => acc + Number(item.amount ?? 0), 0)

  const totalCancelled = (payments ?? []).filter((payment) => payment.status === 'Cancelado').reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const totalClei = confirmedPayments.filter((payment) => payment.destination === 'Clei').reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const totalEdson = confirmedPayments.filter((payment) => payment.destination === 'Edson').reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const totalFunds = confirmedPayments.filter((payment) => payment.destination === 'Fundo do veículo').reduce((acc, item) => acc + Number(item.amount ?? 0), 0)
  const nextDuePayments = confirmedPayments.filter((payment) => payment.payment_date).length
  const latePayments = confirmedPayments.filter((payment) => payment.status === 'Atrasado').length

  const rentedCount = (vehicles ?? []).filter((vehicle) => {
    const status = String(vehicle.status ?? '').toLowerCase()
    return status && status !== 'disponível' && status !== 'available'
  }).length

  const availableCount = (vehicles ?? []).filter((vehicle) => {
    const status = String(vehicle.status ?? '').toLowerCase()
    return status === 'disponível' || status === 'available'
  }).length

  const partnersCount = (vehicles ?? []).filter((vehicle) => vehicle.finance_model === 'partners').length
  const savingsCount = (vehicles ?? []).filter((vehicle) => vehicle.finance_model === 'savings').length

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
      partnersCount,
      savingsCount,
    },
    error: null,
  }
}
