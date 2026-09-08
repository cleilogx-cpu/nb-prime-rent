/**
 * Formatação compartilhada de moeda e data. Antes desta consolidação, existiam
 * 6 cópias quase idênticas espalhadas pelo código (locationLogic.js,
 * PaymentCard.jsx, PaymentDetailsDrawer.jsx, ContractCard.jsx,
 * ContractDetailsDrawer.jsx, contractDocumentContent.js), algumas com o bug de
 * fuso horário (`new Date(value)` sem forçar meia-noite local) já corrigido
 * numa sessão anterior. Esta é a única versão a partir de agora.
 */

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

  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('pt-BR')
}
