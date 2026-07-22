export function calculateNextPartnerBeneficiary(lastBeneficiary) {
  const normalized = String(lastBeneficiary ?? '').trim().toLowerCase()

  if (normalized === 'edson') {
    return 'Clei'
  }

  if (normalized === 'clei') {
    return 'Edson'
  }

  return 'Clei'
}

export function calculateNextDueDate(currentDueDate, fallbackDate) {
  if (currentDueDate) {
    const parsedDate = new Date(currentDueDate)
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10)
    }
  }

  if (fallbackDate) {
    const parsedFallbackDate = new Date(fallbackDate)
    if (!Number.isNaN(parsedFallbackDate.getTime())) {
      return parsedFallbackDate.toISOString().slice(0, 10)
    }
  }

  return null
}

export function validateFinancialDestination({ financeModel, destination, beneficiary }) {
  if (financeModel === 'savings') {
    if (destination !== 'Fundo do veículo') {
      return 'Este valor será destinado ao fundo do veículo.'
    }

    if (beneficiary && ['Clei', 'Edson'].includes(beneficiary)) {
      return 'Não é permitido definir Clei ou Edson como beneficiário em modelo savings.'
    }
  }

  return null
}

export function buildPaymentDestinationLabel(destination, financeModel) {
  if (financeModel === 'savings' || destination === 'Fundo do veículo') {
    return 'Fundo do veículo'
  }

  return destination || 'Alternância entre sócios'
}
