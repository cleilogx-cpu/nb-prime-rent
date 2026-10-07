import test from 'node:test'
import assert from 'node:assert/strict'
import { checkCnhValidity } from './cnhRule.js'

const today = new Date(2030, 0, 10) // 10/01/2030

test('CNH com validade além do mínimo passa', () => {
  assert.equal(checkCnhValidity('2030-03-01', 30, today).ok, true)
  assert.equal(checkCnhValidity('2030-02-09', 30, today).ok, true) // exatamente 30 dias
})

test('CNH que vence em menos do mínimo de dias é bloqueada', () => {
  const result = checkCnhValidity('2030-02-08', 30, today)
  assert.equal(result.ok, false)
  assert.equal(result.daysLeft, 29)
  assert.match(result.message, /29 dia/)
})

test('CNH vencida é bloqueada', () => {
  assert.equal(checkCnhValidity('2030-01-09', 0, today).ok, false)
  assert.equal(checkCnhValidity('2030-01-10', 0, today).ok, true) // vence hoje, mínimo 0
})

test('o mínimo de dias é configurável', () => {
  assert.equal(checkCnhValidity('2030-02-01', 60, today).ok, false)
  assert.equal(checkCnhValidity('2030-02-01', 10, today).ok, true)
})

test('sem validade informada não bloqueia', () => {
  assert.equal(checkCnhValidity('', 30, today).ok, true)
  assert.equal(checkCnhValidity(null, 30, today).ok, true)
})
