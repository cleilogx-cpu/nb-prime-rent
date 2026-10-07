const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Regra de Configurações → Preferências Operacionais: não permitir
 * contratação quando a CNH do locatário vence em menos de `minDays` dias
 * (ou já venceu). Sem validade informada não dá pra avaliar -- não bloqueia
 * (a conferência dos dados continua sendo humana).
 *
 * Devolve { ok, daysLeft, message }.
 */
export function checkCnhValidity(cnhValidity, minDays, today = new Date()) {
  if (!cnhValidity) {
    return { ok: true, daysLeft: null, message: '' }
  }

  const expiry = new Date(`${String(cnhValidity).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(expiry.getTime())) {
    return { ok: true, daysLeft: null, message: '' }
  }

  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysLeft = Math.round((expiry.getTime() - base.getTime()) / DAY_MS)
  const required = Number(minDays || 0)

  if (daysLeft < 0) {
    return { ok: false, daysLeft, message: 'A CNH do locatário está vencida. Não é possível contratar.' }
  }

  if (daysLeft < required) {
    return {
      ok: false,
      daysLeft,
      message: `A CNH do locatário vence em ${daysLeft} dia(s) — menos do mínimo de ${required} dia(s) exigido nas Configurações. Não é possível contratar.`,
    }
  }

  return { ok: true, daysLeft, message: '' }
}
