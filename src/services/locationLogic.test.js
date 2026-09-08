import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateNextPaymentDate, computeLocationFinancials, normalizeLocationStatus } from './locationLogic.js'

test('calculateNextPaymentDate adds seven days to the start date', () => {
  assert.equal(calculateNextPaymentDate('2026-07-22'), '2026-07-29')
})

test('normalizeLocationStatus maps common statuses to a canonical label', () => {
  assert.equal(normalizeLocationStatus('ativa'), 'Ativa')
  assert.equal(normalizeLocationStatus('finalizada'), 'Finalizada')
  assert.equal(normalizeLocationStatus('cancelada'), 'Cancelada')
  assert.equal(normalizeLocationStatus('active'), 'Ativa')
})

test('computeLocationFinancials sums payments by rental_id and ignores cancelled ones', () => {
  const location = { id: 'rental-1', vehicle_id: 'vehicle-1', start_date: '2026-01-01', actual_end_date: '2026-02-01' }
  const payments = [
    { rental_id: 'rental-1', amount: 1200, is_cancelled: false },
    { rental_id: 'rental-1', amount: 500, is_cancelled: true },
    { rental_id: 'rental-2', amount: 999, is_cancelled: false },
  ]

  const { totalReceived } = computeLocationFinancials(location, payments, [])
  assert.equal(totalReceived, 1200)
})

test('computeLocationFinancials also counts Caução payments linked only by contract_id (no rental_id)', () => {
  const location = { id: 'rental-1', contract_id: 'contract-1', vehicle_id: 'vehicle-1', start_date: '2026-01-01', actual_end_date: '2026-02-01' }
  const payments = [
    { rental_id: 'rental-1', contract_id: 'contract-1', amount: 1200, is_cancelled: false },
    { rental_id: null, contract_id: 'contract-1', amount: 1000, is_cancelled: false },
    { rental_id: null, contract_id: 'contract-1', amount: 500, is_cancelled: true },
    { rental_id: null, contract_id: 'contract-other', amount: 777, is_cancelled: false },
  ]

  const { totalReceived } = computeLocationFinancials(location, payments, [])
  assert.equal(totalReceived, 2200)
})

test('computeLocationFinancials uses linked expenses when they exist, ignoring the fallback', () => {
  const location = { id: 'rental-1', vehicle_id: 'vehicle-1', start_date: '2026-01-01', actual_end_date: '2026-02-01' }
  const expenses = [
    { rental_id: 'rental-1', vehicle_id: 'vehicle-1', amount: 300, expense_date: '2026-01-15' },
    { rental_id: null, vehicle_id: 'vehicle-1', amount: 9999, expense_date: '2026-01-20' },
  ]

  const { totalExpenses } = computeLocationFinancials(location, [], expenses)
  assert.equal(totalExpenses, 300)
})

test('computeLocationFinancials falls back to vehicle + period match when no expense is linked by rental_id', () => {
  const location = { id: 'rental-1', vehicle_id: 'vehicle-1', start_date: '2026-01-01', actual_end_date: '2026-02-01' }
  const expenses = [
    { rental_id: null, vehicle_id: 'vehicle-1', amount: 100, expense_date: '2026-01-10' },
    { rental_id: null, vehicle_id: 'vehicle-1', amount: 200, expense_date: '2026-03-01' },
    { rental_id: null, vehicle_id: 'vehicle-2', amount: 300, expense_date: '2026-01-10' },
  ]

  const { totalExpenses } = computeLocationFinancials(location, [], expenses)
  assert.equal(totalExpenses, 100)
})
