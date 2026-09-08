import test from 'node:test'
import assert from 'node:assert/strict'
import { computePaymentTotals, monthRange } from './paymentAggregation.js'

test('monthRange returns the first and last day of the month', () => {
  assert.deepEqual(monthRange(2026, 2), { periodStart: '2026-02-01', periodEnd: '2026-02-28' })
  assert.deepEqual(monthRange(2026, 1), { periodStart: '2026-01-01', periodEnd: '2026-01-31' })
})

test('computePaymentTotals filters by period and ignores cancelled payments in the totals', () => {
  const payments = [
    { amount: 1200, is_cancelled: false, destination: 'Clei', payment_date: '2026-02-05', vehicle_id: 'v1' },
    { amount: 500, is_cancelled: true, destination: 'Clei', payment_date: '2026-02-10', vehicle_id: 'v1' },
    { amount: 900, is_cancelled: false, destination: 'Edson', payment_date: '2026-01-31', vehicle_id: 'v1' },
  ]

  const totals = computePaymentTotals({ payments, periodStart: '2026-02-01', periodEnd: '2026-02-28' })

  assert.equal(totals.receivedTotal, 1200)
  assert.equal(totals.cancelledTotal, 500)
  assert.equal(totals.cleiTotal, 1200)
  assert.equal(totals.edsonTotal, 0)
})

test('computePaymentTotals filters by vehicle when vehicleId is given', () => {
  const payments = [
    { amount: 1000, is_cancelled: false, destination: 'Clei', payment_date: '2026-02-05', vehicle_id: 'v1' },
    { amount: 2000, is_cancelled: false, destination: 'Clei', payment_date: '2026-02-05', vehicle_id: 'v2' },
  ]

  const totals = computePaymentTotals({ payments, periodStart: '2026-02-01', periodEnd: '2026-02-28', vehicleId: 'v1' })

  assert.equal(totals.receivedTotal, 1000)
})

test('computePaymentTotals computes gross result from payments and expenses', () => {
  const payments = [{ amount: 1500, is_cancelled: false, payment_date: '2026-02-05', vehicle_id: 'v1' }]
  const expenses = [{ amount: 400, expense_date: '2026-02-10', vehicle_id: 'v1' }]

  const totals = computePaymentTotals({ payments, expenses, periodStart: '2026-02-01', periodEnd: '2026-02-28' })

  assert.equal(totals.receivedTotal, 1500)
  assert.equal(totals.expensesTotal, 400)
  assert.equal(totals.grossResult, 1100)
})
