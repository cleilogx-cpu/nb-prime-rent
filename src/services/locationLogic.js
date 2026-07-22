export function calculateNextPaymentDate(startDate) {
  if (!startDate) {
    return null
  }

  const parsedDate = new Date(startDate)
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

export function formatCurrency(value) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) {
    return 'R$ 0,00'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numericValue)
}

export function formatDate(value) {
  if (!value) {
    return 'Não informado'
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('pt-BR')
}
