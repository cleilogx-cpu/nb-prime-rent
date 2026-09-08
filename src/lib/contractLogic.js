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

  const parsedDate = new Date(`${startDate}T00:00:00`)
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

const WEEK_LABELS = [
  'Primeira', 'Segunda', 'Terceira', 'Quarta', 'Quinta', 'Sexta', 'Sétima',
  'Oitava', 'Nona', 'Décima', 'Décima primeira', 'Décima segunda', 'Décima terceira',
  'Décima quarta', 'Décima quinta', 'Décima sexta', 'Décima sétima', 'Décima oitava',
  'Décima nona', 'Vigésima',
]

function ordinalWeekLabel(index) {
  return WEEK_LABELS[index] || `${index + 1}ª`
}

/**
 * Gera o cronograma semana a semana de um contrato, no mesmo formato usado
 * no modelo de contrato em papel (1ª semana no ato da assinatura, depois uma
 * data por semana até o fim do prazo).
 */
export function generatePaymentSchedule(startDate, totalWeeks, weeklyRent) {
  if (!startDate || !totalWeeks) {
    return []
  }

  const schedule = []
  const baseDate = new Date(`${startDate}T00:00:00`)

  for (let index = 0; index < totalWeeks; index += 1) {
    const dueDate = new Date(baseDate)
    dueDate.setDate(dueDate.getDate() + index * 7)

    schedule.push({
      week: index + 1,
      label: `${ordinalWeekLabel(index)} semana`,
      due_date: dueDate.toISOString().slice(0, 10),
      amount: Number(weeklyRent || 0),
    })
  }

  return schedule
}

/**
 * Deriva o número de semanas de um contrato a partir de start/end date,
 * arredondando pra cima (contrato de 3 meses ~= 13 semanas, não 12,86).
 */
export function deriveWeeksFromDates(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0
  }

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return 0
  }

  return Math.ceil(diffDays / 7)
}

/**
 * Soma N meses a uma data (usado quando o prazo do contrato é escolhido em
 * meses, ex: 3, 5, 6, 12). O resultado ainda pode ser ajustado manualmente
 * pelo usuário — na prática o contrato real pode fechar 1-2 dias antes/depois
 * do mês "redondo", pra bater com o dia da semana do pagamento.
 */
export function addMonthsToDate(startDate, months) {
  if (!startDate || !months) {
    return null
  }

  const date = new Date(`${startDate}T00:00:00`)
  date.setMonth(date.getMonth() + Number(months))
  return date.toISOString().slice(0, 10)
}
