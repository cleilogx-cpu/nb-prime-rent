export function calculateNextPaymentDate(startDate) {
  if (!startDate) {
    return null
  }

  const parsedDate = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  parsedDate.setDate(parsedDate.getDate() + 7)
  return parsedDate.toISOString().slice(0, 10)
}

export function normalizeLocationStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase()

  if (['active', 'ativa', 'ativo', 'running'].includes(normalized)) {
    return 'Ativa'
  }

  if (['finished', 'finalizada', 'finalizado', 'closed'].includes(normalized)) {
    return 'Finalizada'
  }

  if (['cancelled', 'cancelada', 'canceled', 'cancelado'].includes(normalized)) {
    return 'Cancelada'
  }

  return status || 'Ativa'
}

// formatCurrency/formatDate viviam aqui, mas eram uma cópia (junto com mais
// 5 outras espalhadas pelo código) da mesma formatação de moeda/data. Agora
// tem uma fonte só em src/lib/format.js — re-exportado aqui pra não precisar
// mudar todo mundo que já importa daqui (Locations.jsx, Historico.jsx).
export { formatCurrency, formatDate } from '../lib/format.js'

/**
 * Total Recebido/Total de Gastos de uma locação encerrada, pro Histórico.
 * Recebido soma `rental_payments` não cancelados ligados pelo `rental_id`
 * (Aluguel) OU pelo `contract_id` (Caução -- pode ser cobrada antes de
 * existir locação, então nem sempre carrega `rental_id`; ver
 * chargesService/depositsService do PR3). Gastos soma `expenses` pelo
 * `rental_id` quando existe -- mas como o formulário de Despesas ainda não
 * pede pra vincular a uma locação, a maioria das despesas hoje não tem esse
 * vínculo, então cai no fallback: mesmo veículo, dentro do período da
 * locação (início até o fim real ou previsto).
 */
export function computeLocationFinancials(location, payments, expenses) {
  const totalReceived = (payments ?? [])
    .filter((payment) => {
      if (payment.is_cancelled) {
        return false
      }
      return payment.rental_id === location.id || (location.contract_id && payment.contract_id === location.contract_id)
    })
    .reduce((acc, payment) => acc + Number(payment.amount ?? 0), 0)

  const linkedExpenses = (expenses ?? []).filter((expense) => expense.rental_id === location.id)

  const periodStart = location.start_date
  const periodEnd = location.actual_end_date || location.expected_end_date

  const fallbackExpenses = linkedExpenses.length > 0
    ? []
    : (expenses ?? []).filter((expense) => {
        if (expense.rental_id || expense.vehicle_id !== location.vehicle_id) {
          return false
        }
        if (!expense.expense_date) {
          return false
        }
        if (periodStart && expense.expense_date < periodStart) {
          return false
        }
        if (periodEnd && expense.expense_date > periodEnd) {
          return false
        }
        return true
      })

  const totalExpenses = [...linkedExpenses, ...fallbackExpenses]
    .reduce((acc, expense) => acc + Number(expense.amount ?? 0), 0)

  return { totalReceived, totalExpenses }
}
