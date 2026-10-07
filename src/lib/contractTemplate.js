import { generatePaymentSchedule } from './contractLogic.js'
import { formatCurrency, formatDate, formatTenantAddress } from './format.js'
import { PERIODICITY, PERIODICITY_LABELS } from './constants.js'

/**
 * Modelo de contrato configurável (Configurações > Modelo de Contrato).
 *
 * O MODELO só guarda texto (cláusulas, parágrafos, alíneas) com campos
 * dinâmicos entre colchetes, tipo [NOME DO LOCATÁRIO]. Os dados de verdade
 * vêm dos cadastros que já existem (empresa/responsável em Configurações,
 * locatário, veículo, contrato) e são trocados na hora de gerar a minuta --
 * os campos NÃO criam cadastro nenhum, só apontam pra onde buscar.
 *
 * Nada específico de uma empresa fica neste arquivo: textos, PIX, foro,
 * franquia etc. moram no modelo (banco de dados), não no código.
 */

export const BLOCK_TYPES = {
  HEADING: 'heading',
  CLAUSE: 'clause',
  PARAGRAPH: 'paragraph',
  ITEM: 'item',
  TEXT: 'text',
  CLOSING: 'closing',
}

export const BLOCK_TYPE_LABELS = {
  [BLOCK_TYPES.HEADING]: 'Título de seção',
  [BLOCK_TYPES.CLAUSE]: 'Cláusula',
  [BLOCK_TYPES.PARAGRAPH]: 'Parágrafo',
  [BLOCK_TYPES.ITEM]: 'Alínea',
  [BLOCK_TYPES.TEXT]: 'Texto livre',
  [BLOCK_TYPES.CLOSING]: 'Texto final (centralizado)',
}

const SCHEDULE_TOKEN = 'CRONOGRAMA DE PAGAMENTOS'

const PERIODICITY_TEXT = {
  [PERIODICITY.DAILY]: { unit: 'dia', cadence: 'todo dia', adjective: 'diária' },
  [PERIODICITY.WEEKLY]: { unit: 'semana', cadence: 'toda semana', adjective: 'semanal' },
  [PERIODICITY.BIWEEKLY]: { unit: 'quinzena', cadence: 'a cada quinzena', adjective: 'quinzenal' },
  [PERIODICITY.MONTHLY]: { unit: 'mês', cadence: 'todo mês', adjective: 'mensal' },
}

const DAYS_PER_PERIOD = {
  [PERIODICITY.DAILY]: 1,
  [PERIODICITY.WEEKLY]: 7,
  [PERIODICITY.BIWEEKLY]: 14,
  [PERIODICITY.MONTHLY]: 30,
}

const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']

export function numberToWords(value) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > 99) {
    return String(value)
  }
  if (n < 20) {
    return UNITS[n]
  }
  const ten = TENS[Math.floor(n / 10)]
  return n % 10 === 0 ? ten : `${ten} e ${UNITS[n % 10]}`
}

const notInformed = 'não informado'

function filled(value) {
  const text = value === null || value === undefined ? '' : String(value).trim()
  return text
}

function percentText(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  return `${String(Number(value)).replace('.', ',')}%`
}

/**
 * Catálogo de campos dinâmicos. `scope` diz de onde o dado vem:
 * - 'config' (empresa/responsável): faltou o dado = configuração incompleta,
 *   a geração da minuta é bloqueada e o usuário é mandado pra Configurações;
 * - 'contract' (locatário/veículo/locação): faltou o dado = sai
 *   "não informado" (igual ao comportamento que o contrato sempre teve) e a
 *   revisão da minuta avisa quais campos ficaram sem informação.
 */
export const PLACEHOLDER_GROUPS = [
  {
    key: 'empresa',
    label: 'Empresa',
    source: 'Configurações → Dados da Empresa',
    scope: 'config',
    fields: [
      { token: 'NOME DA EMPRESA', label: 'Nome / Razão Social', get: ({ settings }) => settings.company_name },
      { token: 'NOME FANTASIA', label: 'Nome Fantasia', get: ({ settings }) => settings.company_trade_name },
      { token: 'CPF/CNPJ DA EMPRESA', label: 'CPF/CNPJ', get: ({ settings }) => settings.company_document },
      { token: 'ENDEREÇO DA EMPRESA', label: 'Endereço', get: ({ settings }) => settings.company_address },
      { token: 'TELEFONE DA EMPRESA', label: 'Telefone/WhatsApp', get: ({ settings }) => settings.company_phone },
      { token: 'E-MAIL DA EMPRESA', label: 'E-mail', get: ({ settings }) => settings.company_email },
    ],
  },
  {
    key: 'locador',
    label: 'Responsável / Locador',
    source: 'Configurações → Responsável pelo Contrato',
    scope: 'config',
    fields: [
      { token: 'NOME DO LOCADOR', label: 'Nome completo', get: ({ settings }) => String(settings.resp_name || '').toUpperCase() },
      { token: 'CPF DO LOCADOR', label: 'CPF', get: ({ settings }) => settings.resp_cpf },
      { token: 'RG DO LOCADOR', label: 'RG', get: ({ settings }) => settings.resp_rg },
      { token: 'ENDEREÇO DO LOCADOR', label: 'Endereço', get: ({ settings }) => settings.resp_address },
      { token: 'TELEFONE DO LOCADOR', label: 'Telefone', get: ({ settings }) => settings.resp_phone },
      { token: 'E-MAIL DO LOCADOR', label: 'E-mail', get: ({ settings }) => settings.resp_email },
      { token: 'CARGO/FUNÇÃO DO LOCADOR', label: 'Cargo/Função', get: ({ settings }) => settings.resp_role },
    ],
  },
  {
    key: 'locatario',
    label: 'Locatário',
    source: 'Cadastro do locatário (Contratos)',
    scope: 'contract',
    fields: [
      { token: 'NOME DO LOCATÁRIO', label: 'Nome completo', get: ({ tenant }) => String(tenant.full_name || '').toUpperCase() },
      { token: 'CPF DO LOCATÁRIO', label: 'CPF', get: ({ tenant }) => tenant.cpf },
      { token: 'RG DO LOCATÁRIO', label: 'RG', get: ({ tenant }) => tenant.rg },
      { token: 'DATA DE NASCIMENTO', label: 'Data de nascimento', get: ({ tenant }) => (tenant.birth_date ? formatDate(tenant.birth_date) : '') },
      { token: 'ENDEREÇO DO LOCATÁRIO', label: 'Endereço', get: ({ tenant }) => {
        const address = formatTenantAddress(tenant)
        return address === 'Não informado' ? '' : address
      } },
      { token: 'TELEFONE DO LOCATÁRIO', label: 'Telefone', get: ({ tenant }) => tenant.phone },
      { token: 'CNH', label: 'Número da CNH', get: ({ tenant }) => tenant.cnh_number },
      { token: 'VALIDADE DA CNH', label: 'Validade da CNH', get: ({ tenant }) => (tenant.cnh_validity ? formatDate(tenant.cnh_validity) : '') },
    ],
  },
  {
    key: 'veiculo',
    label: 'Veículo',
    source: 'Cadastro de Veículos',
    scope: 'contract',
    fields: [
      { token: 'VEÍCULO', label: 'Veículo (marca/modelo)', get: ({ vehicle }) => vehicle.model },
      { token: 'MARCA/MODELO', label: 'Marca/Modelo', get: ({ vehicle }) => vehicle.model },
      { token: 'PLACA', label: 'Placa', get: ({ vehicle }) => vehicle.plate },
      { token: 'ANO', label: 'Ano/Modelo', get: ({ vehicle }) => vehicle.year },
      { token: 'CHASSI', label: 'Chassi', get: ({ vehicle }) => vehicle.chassis },
      { token: 'COR', label: 'Cor', get: ({ vehicle }) => vehicle.color },
    ],
  },
  {
    key: 'locacao',
    label: 'Locação',
    source: 'Condições do próprio contrato',
    scope: 'contract',
    fields: [
      { token: 'NÚMERO DO CONTRATO', label: 'Número do contrato', get: ({ contract }) => contract.contract_number },
      { token: 'VALOR DA LOCAÇÃO', label: 'Valor da locação', get: ({ contract }) => formatCurrency(contract.payment_amount) },
      { token: 'VALOR DIÁRIO', label: 'Valor equivalente por dia', get: ({ contract, periodicity }) => formatCurrency(Number(contract.payment_amount || 0) / (DAYS_PER_PERIOD[periodicity] || 7)) },
      { token: 'PERIODICIDADE', label: 'Periodicidade (ex.: semanal)', get: ({ periodicity }) => PERIODICITY_TEXT[periodicity]?.adjective || PERIODICITY_LABELS[periodicity]?.toLowerCase() },
      { token: 'UNIDADE DE PAGAMENTO', label: 'Unidade (dia/semana/quinzena/mês)', get: ({ periodicity }) => PERIODICITY_TEXT[periodicity]?.unit },
      { token: 'FREQUÊNCIA DE PAGAMENTO', label: 'Frequência (ex.: toda semana)', get: ({ periodicity }) => PERIODICITY_TEXT[periodicity]?.cadence },
      { token: 'CAUÇÃO', label: 'Valor da caução', get: ({ contract }) => formatCurrency(contract.deposit_amount) },
      { token: 'DATA DE INÍCIO', label: 'Data de início', get: ({ contract }) => (contract.start_date ? formatDate(contract.start_date) : '') },
      { token: 'DATA DE TÉRMINO', label: 'Data de término', get: ({ contract }) => (contract.end_date ? formatDate(contract.end_date) : '') },
      { token: 'PRAZO', label: 'Prazo (ex.: 13 (treze) semanas)', get: ({ contract }) => {
        const weeks = Number(contract.weeks || 0)
        return weeks ? `${weeks} (${numberToWords(weeks)}) ${weeks === 1 ? 'semana' : 'semanas'}` : ''
      } },
      { token: 'KM INICIAL', label: 'Quilometragem inicial', get: ({ contract }) => (contract.initial_km === null || contract.initial_km === undefined ? '' : `${contract.initial_km} km`) },
      { token: 'MULTA POR ATRASO', label: 'Multa por atraso (%)', get: ({ lateFee }) => percentText(lateFee) },
      { token: 'JUROS DE MORA', label: 'Juros de mora ao mês (%)', get: ({ lateInterest }) => percentText(lateInterest) },
      { token: SCHEDULE_TOKEN, label: 'Cronograma de pagamentos (lista)', get: () => 'x' },
    ],
  },
]

const FIELD_INDEX = new Map()
PLACEHOLDER_GROUPS.forEach((group) => {
  group.fields.forEach((field) => FIELD_INDEX.set(field.token, { ...field, scope: group.scope, groupLabel: group.label, source: group.source }))
})

export function isKnownToken(token) {
  return FIELD_INDEX.has(normalizeToken(token))
}

export function normalizeToken(token) {
  return String(token || '').trim().replace(/\s+/g, ' ').toUpperCase()
}

const TOKEN_PATTERN = /\[([^[\]\n]+)\]/g

/** Campos [..] encontrados num texto (sem repetir). */
export function extractTokens(text) {
  const found = new Set()
  for (const match of String(text || '').matchAll(TOKEN_PATTERN)) {
    found.add(normalizeToken(match[1]))
  }
  return [...found]
}

function allTemplateTexts(template) {
  const header = template?.header || {}
  return [
    header.kicker, header.title, header.subtitle, header.date, header.heading,
    ...(template?.blocks || []).flatMap((block) => [block.title, block.text]),
  ]
}

/** Lista de campos [..] do modelo que não existem no catálogo (erro de digitação). */
export function findUnknownTokens(template) {
  const unknown = new Set()
  allTemplateTexts(template).forEach((text) => {
    extractTokens(text).forEach((token) => {
      if (!FIELD_INDEX.has(token)) {
        unknown.add(token)
      }
    })
  })
  return [...unknown]
}

/**
 * Problemas que impedem VALIDAR o modelo (a revisão mostra a lista).
 */
export function validateTemplateContent(template) {
  const problems = []
  const header = template?.header || {}
  const blocks = template?.blocks || []

  if (!filled(header.title)) {
    problems.push('Informe o título do contrato (cabeçalho).')
  }
  if (!blocks.some((block) => block.type === BLOCK_TYPES.CLAUSE)) {
    problems.push('Adicione pelo menos uma cláusula.')
  }
  blocks.forEach((block, index) => {
    if (!filled(block.text) && !(block.type === BLOCK_TYPES.CLAUSE && filled(block.title))) {
      problems.push(`O item ${index + 1} (${BLOCK_TYPE_LABELS[block.type] || block.type}) está sem texto.`)
    }
  })
  findUnknownTokens(template).forEach((token) => {
    problems.push(`Campo desconhecido: [${token}]. Use a lista "Inserir campo" para evitar erro de digitação.`)
  })

  return problems
}

export function ordinalFeminine(n) {
  return `${n}ª`
}

export function paragraphMark(n) {
  return n <= 9 ? `§ ${n}º` : `§ ${n}`
}

export function itemLetter(index) {
  let n = index
  let letters = ''
  do {
    letters = String.fromCharCode(97 + (n % 26)) + letters
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return `${letters})`
}

/**
 * Numeração automática (não é digitada no texto -- assim reordenar não
 * deixa número errado): títulos de seção "1.", "2."...; cláusulas
 * "CLÁUSULA 1ª"; parágrafos "§ 1º" (reinicia a cada cláusula); alíneas
 * "a)" (reinicia a cada cláusula ou parágrafo).
 */
export function numberBlocks(blocks) {
  let section = 0
  let clause = 0
  let paragraph = 0
  let item = 0

  return (blocks || []).map((block) => {
    switch (block.type) {
      case BLOCK_TYPES.HEADING:
        section += 1
        return { ...block, label: `${section}.` }
      case BLOCK_TYPES.CLAUSE:
        clause += 1
        paragraph = 0
        item = 0
        return { ...block, label: `CLÁUSULA ${ordinalFeminine(clause)}` }
      case BLOCK_TYPES.PARAGRAPH:
        paragraph += 1
        item = 0
        return { ...block, label: paragraphMark(paragraph) }
      case BLOCK_TYPES.ITEM: {
        const label = itemLetter(item)
        item += 1
        return { ...block, label }
      }
      default:
        return { ...block, label: '' }
    }
  })
}

function buildContext({ contract, settings }) {
  const periodicity = contract.periodicity || PERIODICITY.WEEKLY
  return {
    settings: settings || {},
    contract,
    tenant: contract.tenants || {},
    vehicle: contract.vehicles || {},
    periodicity,
    // Multa/juros do PRÓPRIO contrato (snapshot gravado na criação) --
    // mudar o padrão em Configurações depois não altera contrato antigo.
    lateFee: contract.late_fee_percent ?? settings?.late_fee_percent,
    lateInterest: contract.late_interest_percent_month ?? settings?.late_interest_percent_month,
  }
}

function scheduleLines(context) {
  const { contract, periodicity } = context
  return generatePaymentSchedule(contract.start_date, contract.end_date, periodicity, Number(contract.payment_amount || 0))
    .map((item) => `${item.label}: Pagamento no dia ${formatDate(item.due_date)}${item.week === 1 ? ' (ato da assinatura deste contrato)' : ''};`)
}

/**
 * Troca os campos [..] de um texto pelos dados reais. Devolve também a
 * lista de campos que ficaram sem informação (`missing`) e os desconhecidos.
 * mode 'tokens' mantém os [CAMPOS] visíveis (revisão do modelo).
 */
function resolveText(text, context, missing, mode) {
  return String(text || '').replace(TOKEN_PATTERN, (whole, raw) => {
    const token = normalizeToken(raw)
    const field = FIELD_INDEX.get(token)

    if (!field || mode === 'tokens') {
      return whole
    }
    if (token === SCHEDULE_TOKEN) {
      return scheduleLines(context).join(' ')
    }

    const value = filled(field.get(context))
    if (!value) {
      missing.push({ token, label: field.label, groupLabel: field.groupLabel, source: field.source, scope: field.scope })
      return field.scope === 'config' ? whole : notInformed
    }
    return value
  })
}

/**
 * Converte o modelo + os dados reais em "seções" (o mesmo formato que o
 * gerador de PDF e de Word já consome). `contract` precisa vir com
 * `tenants` e `vehicles` carregados (mesmo select usado em Contratos).
 */
export function renderTemplate(template, { contract, settings, mode = 'values' }) {
  const context = buildContext({ contract, settings })
  const missing = []
  const resolve = (text) => resolveText(text, context, missing, mode)
  const header = template?.header || {}
  const sections = []

  if (filled(header.kicker)) sections.push({ type: 'kicker', text: resolve(header.kicker) })
  if (filled(header.title)) sections.push({ type: 'title', text: resolve(header.title) })
  if (filled(header.subtitle)) sections.push({ type: 'subtitle', text: resolve(header.subtitle) })
  if (filled(header.date)) sections.push({ type: 'date', text: resolve(header.date) })
  if (filled(header.heading)) sections.push({ type: 'heading', text: resolve(header.heading) })

  numberBlocks(template?.blocks).forEach((block) => {
    const text = filled(block.text)
    switch (block.type) {
      case BLOCK_TYPES.HEADING:
        sections.push({ type: 'subheading', text: `${block.label} ${resolve(block.text).toUpperCase()}`.trim() })
        break
      case BLOCK_TYPES.CLAUSE:
        if (filled(block.title)) {
          sections.push({ type: 'clausetitle', text: `${block.label} — ${resolve(block.title).toUpperCase()}` })
          if (text) sections.push({ type: 'paragraph', text: resolve(block.text) })
        } else {
          sections.push({ type: 'paragraph', text: `${block.label} — ${resolve(block.text)}` })
        }
        break
      case BLOCK_TYPES.PARAGRAPH:
        sections.push({ type: 'paragraph', text: `${block.label} ${resolve(block.text)}`, indent: 1 })
        break
      case BLOCK_TYPES.ITEM:
        sections.push({ type: 'paragraph', text: `${block.label} ${resolve(block.text)}`, indent: 2 })
        break
      case BLOCK_TYPES.CLOSING:
        sections.push({ type: 'closing', text: resolve(block.text) })
        break
      default:
        if (text === `[${SCHEDULE_TOKEN}]` && mode !== 'tokens') {
          sections.push({ type: 'list', items: scheduleLines(context) })
        } else if (text) {
          sections.push({ type: 'paragraph', text: resolve(block.text) })
        }
    }
  })

  // Identificação das partes ao final -- a assinatura em si é feita fora
  // do sistema (ex.: GOV.BR), aqui só as linhas e a identificação.
  const locatorName = resolve('[NOME DO LOCADOR]')
  const locatorCpf = resolve('[CPF DO LOCADOR]')
  const tenantName = resolve('[NOME DO LOCATÁRIO]')
  const tenantCpf = resolve('[CPF DO LOCATÁRIO]')
  sections.push({
    type: 'signature',
    locador: locatorName,
    locadorCpf: locatorCpf,
    locadorRole: 'LOCADOR / REPRESENTANTE',
    locatario: tenantName,
    locatarioCpf: tenantCpf,
    locatarioRole: 'LOCATÁRIO',
  })

  const seen = new Set()
  const uniqueMissing = missing.filter((item) => {
    if (seen.has(item.token)) return false
    seen.add(item.token)
    return true
  })

  return {
    sections,
    missingConfig: uniqueMissing.filter((item) => item.scope === 'config'),
    missingContract: uniqueMissing.filter((item) => item.scope === 'contract'),
  }
}

export function newBlockId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** Dados fictícios só pra pré-visualizar o modelo nas Configurações. */
export const SAMPLE_CONTRACT = {
  contract_number: 'EXEMPLO-0001',
  start_date: '2030-01-07',
  end_date: '2030-04-07',
  weeks: 13,
  periodicity: PERIODICITY.WEEKLY,
  payment_amount: 1500,
  deposit_amount: 1500,
  initial_km: 12000,
  late_fee_percent: 10,
  late_interest_percent_month: 1,
  tenants: {
    full_name: 'Maria Exemplo da Silva',
    cpf: '000.000.000-00',
    rg: '0000000',
    phone: '(00) 00000-0000',
    birth_date: '1990-05-20',
    cnh_number: '00000000000',
    cnh_validity: '2032-01-01',
    address_street: 'Rua Exemplo',
    address_number: '100',
    address_neighborhood: 'Centro',
    address_zip: '00000-000',
    address_city: 'Cidade',
    address_state: 'UF',
  },
  vehicles: { model: 'Marca Modelo Exemplo', plate: 'ABC1D23', year: '2025/2025', chassis: '9BWZZZ00000000000', color: 'Branco' },
}
