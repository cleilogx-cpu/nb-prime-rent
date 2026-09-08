/**
 * Soma meses a uma data (string "YYYY-MM-DD") "grampeando" o dia no último
 * dia do mês de destino quando ele não existir lá.
 *
 * `date.setMonth()` puro do JS NÃO faz esse ajuste — ele estoura pro mês
 * seguinte: 31/01 + 1 mês vira 03/03 (não 28/02). Isso já causava contratos
 * com data final errada quando o dia de início era 29, 30 ou 31 — só não
 * tinha aparecido ainda porque nenhum contrato real começou nesses dias.
 */
export function addMonthsClamped(startDate, months) {
  const date = new Date(`${startDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const originalDay = date.getDate()

  // Vai pro dia 1 antes de mudar o mês, pra não deixar o próprio JS estourar
  // o mês de partida (ex: 31 de um mês de 30 dias antes mesmo de somar nada).
  date.setDate(1)
  date.setMonth(date.getMonth() + Number(months))

  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(originalDay, lastDayOfTargetMonth))

  return date.toISOString().slice(0, 10)
}
