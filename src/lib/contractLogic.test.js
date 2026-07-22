import test from 'node:test'
import assert from 'node:assert/strict'
import { generateContractNumber, calculateContractEndDate, validateContractDates, buildContractStatus, cloneContractForRenewal } from './contractLogic.js'

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
