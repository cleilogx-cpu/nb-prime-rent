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
