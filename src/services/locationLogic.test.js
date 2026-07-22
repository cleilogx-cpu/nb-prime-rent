import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateNextPaymentDate, normalizeLocationStatus } from './locationLogic.js'

test('calculateNextPaymentDate adds seven days to the start date', () => {
  assert.equal(calculateNextPaymentDate('2026-07-22'), '2026-07-29')
})

test('normalizeLocationStatus maps common statuses to a canonical label', () => {
  assert.equal(normalizeLocationStatus('ativa'), 'Ativa')
  assert.equal(normalizeLocationStatus('finalizada'), 'Finalizada')
  assert.equal(normalizeLocationStatus('cancelada'), 'Cancelada')
  assert.equal(normalizeLocationStatus('active'), 'Ativa')
})
