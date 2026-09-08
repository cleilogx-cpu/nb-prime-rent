/**
 * Fonte única pros totais financeiros (Recebimentos, Despesas, Resultado
 * Bruto, Pago/Cancelado, Clei/Edson/Fundos). Usado pelo Dashboard (Resumo
 * Financeiro) e por Recebimentos -- antes cada tela recalculava isso do
 * seu jeito, e o card "Total pago no mês" de Recebimentos na real somava
 * tudo desde sempre, sem filtro de data nenhum.
 *
 * `payments`/`expenses` já vêm carregados (a tela decide o que buscar);
 * aqui só filtra por período/veículo e soma. Datas são comparadas como
 * string 'YYYY-MM-DD' (sem parsear com `new Date`), evitando o problema
 * de fuso horário do UTC-3 nas comparações de intervalo.
 */
export function computePaymentTotals({ payments = [], expenses = [], periodStart, periodEnd, vehicleId } = {}) {
  const inRange = (dateValue) => {
    if (!dateValue) {
      return false
    }
    if (periodStart && dateValue < periodStart) {
      return false
    }
    if (periodEnd && dateValue > periodEnd) {
      return false
    }
    return true
  }

  const scopedPayments = payments.filter((payment) => {
    if (vehicleId && payment.vehicle_id !== vehicleId) {
      return false
    }
    return inRange(payment.payment_date)
  })

  const scopedExpenses = expenses.filter((expense) => {
    if (vehicleId && expense.vehicle_id !== vehicleId) {
      return false
    }
    return inRange(expense.expense_date)
  })

  const confirmedPayments = scopedPayments.filter((payment) => !payment.is_cancelled)
  const cancelledPayments = scopedPayments.filter((payment) => payment.is_cancelled)

  const sum = (list) => list.reduce((acc, item) => acc + Number(item.amount ?? 0), 0)

  const receivedTotal = sum(confirmedPayments)
  const expensesTotal = sum(scopedExpenses)

  return {
    receivedTotal,
    expensesTotal,
    grossResult: receivedTotal - expensesTotal,
    paidTotal: receivedTotal,
    cancelledTotal: sum(cancelledPayments),
    cleiTotal: sum(confirmedPayments.filter((payment) => payment.destination === 'Clei')),
    edsonTotal: sum(confirmedPayments.filter((payment) => payment.destination === 'Edson')),
    fundsTotal: sum(confirmedPayments.filter((payment) => payment.destination === 'Fundo do veículo')),
    paymentsCount: confirmedPayments.length,
  }
}

/**
 * Intervalo `YYYY-MM-DD` (início/fim) de um mês/ano -- pro seletor
 * Mês/Ano do Dashboard e de Recebimentos.
 */
export function monthRange(year, month) {
  const paddedMonth = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()

  return {
    periodStart: `${year}-${paddedMonth}-01`,
    periodEnd: `${year}-${paddedMonth}-${String(lastDay).padStart(2, '0')}`,
  }
}

export const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
