import { addMonthsClamped } from './dateMath.js'
import { PERIODICITY } from './constants.js'

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

const PERIODICITY_STEP_DAYS = {
  [PERIODICITY.DAILY]: 1,
  [PERIODICITY.WEEKLY]: 7,
  [PERIODICITY.BIWEEKLY]: 14,
}

function scheduleLabel(index, periodicity) {
  const ordinal = ordinalWeekLabel(index)

  if (periodicity === PERIODICITY.DAILY) return `${ordinal} diária`
  if (periodicity === PERIODICITY.MONTHLY) return `${ordinal} parcela mensal`
  if (periodicity === PERIODICITY.BIWEEKLY) return `${ordinal} quinzena`
  return `${ordinal} semana`
}

/**
 * Data da N-ésima cobrança, sempre ancorada na data de início original —
 * nunca acumulando a partir da cobrança anterior. Isso importa pra mensal:
 * um contrato começando dia 31 tem que voltar pro dia 31 assim que possível
 * (ex: fevereiro grampeia pra 28, mas março já volta pro 31), em vez de
 * ficar preso no 28 pra sempre só porque bateu num mês curto uma vez.
 */
function computeInstallmentDate(startDate, index, periodicity) {
  if (periodicity === PERIODICITY.MONTHLY) {
    return addMonthsClamped(startDate, index)
  }

  const stepDays = PERIODICITY_STEP_DAYS[periodicity] ?? PERIODICITY_STEP_DAYS[PERIODICITY.WEEKLY]
  const date = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  date.setDate(date.getDate() + index * stepDays)
  return date.toISOString().slice(0, 10)
}

/**
 * Gera o cronograma previsto de cobranças entre startDate e endDate,
 * conforme a periodicidade do contrato (diária/semanal/quinzenal/mensal).
 * Segue o mesmo formato usado no modelo de contrato em papel (1ª cobrança
 * no ato da assinatura, depois uma por período até o fim do prazo).
 */
export function generatePaymentSchedule(startDate, endDate, periodicity, amount) {
  if (!startDate || !endDate) {
    return []
  }

  const endTime = new Date(`${endDate}T00:00:00`).getTime()
  if (Number.isNaN(endTime)) {
    return []
  }

  const schedule = []
  const maxInstallments = 1000 // trava de segurança contra periodicidade/datas inválidas

  for (let index = 0; index < maxInstallments; index += 1) {
    const dueDate = computeInstallmentDate(startDate, index, periodicity)
    if (!dueDate) {
      break
    }

    if (new Date(`${dueDate}T00:00:00`).getTime() > endTime) {
      break
    }

    schedule.push({
      week: index + 1,
      label: scheduleLabel(index, periodicity),
      due_date: dueDate,
      amount: Number(amount || 0),
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

  return addMonthsClamped(startDate, Number(months))
}
