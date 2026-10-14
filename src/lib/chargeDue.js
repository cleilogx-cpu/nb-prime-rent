import { formatCurrency, formatDate } from './format.js'

const DAY_MS = 24 * 60 * 60 * 1000

/** Dias de antecedência considerados "próximo do vencimento" no Dashboard. */
export const DUE_SOON_DAYS = 7

/** Data de hoje (YYYY-MM-DD) no fuso do computador -- não em UTC. */
export function todayLocalISO(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Soma dias a uma data YYYY-MM-DD (calendário local, sem desvio de fuso). */
export function addDaysISO(isoDate, days) {
  const [year, month, day] = String(isoDate).split('-').map(Number)
  return todayLocalISO(new Date(year, month - 1, day + Number(days)))
}

/** Diferença em dias inteiros (due - today); negativa = já venceu. */
export function daysUntil(dueISO, todayISO) {
  const [dy, dm, dd] = String(dueISO).split('-').map(Number)
  const [ty, tm, td] = String(todayISO).split('-').map(Number)
  return Math.round((new Date(dy, dm - 1, dd) - new Date(ty, tm - 1, td)) / DAY_MS)
}

/** "vence hoje", "vence amanhã", "vence em 3 dias". */
export function describeUpcoming(dueISO, todayISO) {
  const days = daysUntil(dueISO, todayISO)
  if (days <= 0) return 'vence hoje'
  if (days === 1) return 'vence amanhã'
  return `vence em ${days} dias`
}

/**
 * Mensagem pronta do WhatsApp (o operador só confere e envia): lembrete
 * preventivo (antes do vencimento) ou cobrança (já vencido).
 */
export function buildChargeMessage(charge, kind) {
  const name = charge.tenants?.full_name || ''
  const plate = charge.vehicles?.plate || 'veículo'
  const value = formatCurrency(charge.amount)
  const date = formatDate(charge.due_date)
  const greeting = name ? `Olá, ${name}!` : 'Olá!'

  if (kind === 'overdue') {
    return `${greeting} Identificamos que o pagamento de ${value} do veículo ${plate}, com vencimento em ${date}, ainda está em aberto. Pode nos confirmar o pagamento?`
  }

  return `${greeting} Passando para lembrar que o pagamento de ${value} do veículo ${plate} vence em ${date}.`
}

/** Janela padrão da lista de Contratos: criados nos últimos 30 dias. */
export const RECENT_CONTRACTS_DAYS = 30

/**
 * Início (00:00 no fuso do computador) de "há N dias", em ISO/UTC pronto pra
 * comparar com `created_at`. Ex.: hoje 14/10 -> contratos criados a partir
 * de 14/09 00:00.
 */
export function daysAgoStartISO(days, now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - Number(days)).toISOString()
}

/** Mesmas regras de paginação em todas as telas: 30 por página. */
export const PAGE_SIZE = 30

export function pageRange(page, pageSize = PAGE_SIZE) {
  const from = (Math.max(1, page) - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export function totalPages(count, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil((count || 0) / pageSize))
}

/** Tira caracteres que quebram o filtro `.or(...)` do PostgREST. */
export function sanitizeSearchTerm(value) {
  return String(value || '').replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim()
}
