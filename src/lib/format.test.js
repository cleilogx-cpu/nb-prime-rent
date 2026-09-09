import test from 'node:test'
import assert from 'node:assert/strict'
import { formatCPF } from './format.js'

test('formatCPF masks progressively as digits are typed', () => {
  assert.equal(formatCPF('1'), '1')
  assert.equal(formatCPF('123'), '123')
  assert.equal(formatCPF('1234'), '123.4')
  assert.equal(formatCPF('123456'), '123.456')
  assert.equal(formatCPF('1234567'), '123.456.7')
  assert.equal(formatCPF('123456789'), '123.456.789')
  assert.equal(formatCPF('1234567890'), '123.456.789-0')
  assert.equal(formatCPF('12345678901'), '123.456.789-01')
})

test('formatCPF strips non-digits and caps at 11 digits', () => {
  assert.equal(formatCPF('123.456.789-01'), '123.456.789-01')
  assert.equal(formatCPF('1234567890199999'), '123.456.789-01')
})

test('formatCPF handles empty/null input', () => {
  assert.equal(formatCPF(''), '')
  assert.equal(formatCPF(null), '')
  assert.equal(formatCPF(undefined), '')
})
