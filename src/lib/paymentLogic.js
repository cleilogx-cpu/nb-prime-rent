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
