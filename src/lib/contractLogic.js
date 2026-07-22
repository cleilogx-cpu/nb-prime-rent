export function generateContractNumber(year = new Date().getFullYear()) {
  const now = new Date()
  const currentYear = year || now.getFullYear()
  const sequence = `${now.getTime()}`.slice(-4)
  return `NB-${currentYear}-${sequence}`
}

export function calculateContractEndDate(startDate, weeks) {
  if (!startDate) {
    return null
  }

  const parsedDate = new Date(startDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  const totalWeeks = Number(weeks || 0)
  if (!totalWeeks) {
    return parsedDate.toISOString().slice(0, 10)
  }

  parsedDate.setDate(parsedDate.getDate() + totalWeeks * 7)
  return parsedDate.toISOString().slice(0, 10)
}

export function validateContractDates(startDate, endDate) {
  if (!startDate || !endDate) {
    return 'As datas de início e término são obrigatórias.'
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'As datas informadas são inválidas.'
  }

  if (end < start) {
    return 'A data de término não pode ser anterior à data de início.'
  }

  return null
}

export function buildContractStatus(status, endDate) {
  const normalized = String(status ?? '').trim().toLowerCase()
  if (normalized === 'draft' || normalized === 'rascunho') {
    return 'Rascunho'
  }
  if (normalized === 'active' || normalized === 'ativo') {
    return 'Ativo'
  }
  if (normalized === 'ended' || normalized === 'encerrado') {
    return 'Encerrado'
  }
  if (normalized === 'cancelled' || normalized === 'cancelado') {
    return 'Cancelado'
  }
  if (endDate) {
    const parsedEndDate = new Date(endDate)
    if (!Number.isNaN(parsedEndDate.getTime()) && parsedEndDate < new Date()) {
      return 'Vencido'
    }
  }
  return status || 'Rascunho'
}

export function cloneContractForRenewal(contract) {
  return {
    ...contract,
    id: undefined,
    contract_number: undefined,
    previous_contract_id: contract.id,
    status: 'Rascunho',
    history: [
      ...(contract.history || []),
      {
        action: 'Renovado',
        at: new Date().toISOString(),
      },
    ],
  }
}
