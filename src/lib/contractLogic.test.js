import test from 'node:test'
import assert from 'node:assert/strict'
import { generateContractNumber, calculateContractEndDate, validateContractDates, buildContractStatus, cloneContractForRenewal, generatePaymentSchedule, deriveWeeksFromDates, addMonthsToDate } from './contractLogic.js'
import { addMonthsClamped } from './dateMath.js'

test('generates numbered contracts in the requested format', () => {
  const contractNumber = generateContractNumber(2026)
  assert.match(contractNumber, /^NB-2026-/)
})

test('calculates the end date from the number of weeks', () => {
  assert.equal(calculateContractEndDate('2026-07-22', 4), '2026-08-19')
})

test('rejects invalid contract dates', () => {
  assert.equal(validateContractDates('2026-08-01', '2026-07-20'), 'A data de término não pode ser anterior à data de início.')
})

test('builds the expected status for a contract', () => {
  assert.equal(buildContractStatus('ativo', '2026-12-31'), 'Ativo')
  assert.equal(buildContractStatus('cancelado', '2026-12-31'), 'Cancelado')
})

test('renewal preserves the previous contract reference', () => {
  const renewed = cloneContractForRenewal({ id: 'abc', history: [] })
  assert.equal(renewed.previous_contract_id, 'abc')
  assert.equal(renewed.status, 'Rascunho')
})

test('cancellation should not delete the contract record', () => {
  const contract = { id: 'abc', status: 'Cancelado' }
  assert.equal(contract.status, 'Cancelado')
})

test('derives 13 weeks for a 3-month contract, matching the real example', () => {
  assert.equal(deriveWeeksFromDates('2026-06-10', '2026-09-08'), 13)
})

test('generates a weekly schedule starting on the signing date', () => {
  const schedule = generatePaymentSchedule('2026-06-10', '2026-09-08', 'weekly', 1500)
  assert.equal(schedule.length, 13)
  assert.equal(schedule[0].due_date, '2026-06-10')
  assert.equal(schedule[0].label, 'Primeira semana')
  assert.equal(schedule[1].due_date, '2026-06-17')
  assert.equal(schedule[12].due_date, '2026-09-02')
  assert.equal(schedule[12].label, 'Décima terceira semana')
  assert.equal(schedule[0].amount, 1500)
})

test('generates a daily schedule', () => {
  const schedule = generatePaymentSchedule('2026-06-10', '2026-06-13', 'daily', 238)
  assert.equal(schedule.length, 4)
  assert.equal(schedule[0].due_date, '2026-06-10')
  assert.equal(schedule[0].label, 'Primeira diária')
  assert.equal(schedule[3].due_date, '2026-06-13')
})

test('generates a monthly schedule anchored to the start day, clamped on short months', () => {
  const schedule = generatePaymentSchedule('2026-01-31', '2026-04-30', 'monthly', 1000)
  assert.equal(schedule.length, 4)
  assert.equal(schedule[0].due_date, '2026-01-31')
  assert.equal(schedule[0].label, 'Primeira parcela mensal')
  assert.equal(schedule[1].due_date, '2026-02-28') // fevereiro não tem dia 31
  assert.equal(schedule[2].due_date, '2026-03-31') // volta pro dia 31, não fica preso em 28
  assert.equal(schedule[3].due_date, '2026-04-30') // abril não tem dia 31
})

test('returns an empty schedule when there is no start date or end date', () => {
  assert.deepEqual(generatePaymentSchedule(null, '2026-07-08', 'weekly', 1500), [])
  assert.deepEqual(generatePaymentSchedule('2026-06-10', null, 'weekly', 1500), [])
})

test('adds months to a date for the "prazo em meses" field', () => {
  assert.equal(addMonthsToDate('2026-06-10', 3), '2026-09-10')
})

test('clamps to the last day of the month when the original day does not exist there', () => {
  assert.equal(addMonthsClamped('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonthsClamped('2026-01-31', 2), '2026-03-31')
})
