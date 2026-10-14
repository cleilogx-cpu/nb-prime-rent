import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PAGE_SIZE,
  addDaysISO,
  buildChargeMessage,
  daysUntil,
  describeUpcoming,
  pageRange,
  sanitizeSearchTerm,
  todayLocalISO,
  totalPages,
} from './chargeDue.js'

test('todayLocalISO usa o calendário local, não UTC', () => {
  // 22:30 do dia 14 em UTC-3 já é dia 15 em UTC -- o "hoje" local continua 14.
  const lateNight = new Date(2026, 9, 14, 22, 30)
  assert.equal(todayLocalISO(lateNight), '2026-10-14')
  assert.equal(todayLocalISO(new Date(2026, 0, 5, 0, 1)), '2026-01-05')
})

test('addDaysISO atravessa fim de mês e de ano', () => {
  assert.equal(addDaysISO('2026-10-14', 7), '2026-10-21')
  assert.equal(addDaysISO('2026-10-28', 7), '2026-11-04')
  assert.equal(addDaysISO('2026-12-30', 3), '2027-01-02')
})

test('daysUntil: positivo = futuro, zero = hoje, negativo = vencido', () => {
  assert.equal(daysUntil('2026-10-21', '2026-10-14'), 7)
  assert.equal(daysUntil('2026-10-14', '2026-10-14'), 0)
  assert.equal(daysUntil('2026-10-10', '2026-10-14'), -4)
})

test('describeUpcoming', () => {
  assert.equal(describeUpcoming('2026-10-14', '2026-10-14'), 'vence hoje')
  assert.equal(describeUpcoming('2026-10-15', '2026-10-14'), 'vence amanhã')
  assert.equal(describeUpcoming('2026-10-18', '2026-10-14'), 'vence em 4 dias')
})

test('mensagens de WhatsApp: lembrete e cobrança', () => {
  const charge = { amount: 1500, due_date: '2026-10-21', tenants: { full_name: 'Maria' }, vehicles: { plate: 'ABC1D23' } }
  const reminder = buildChargeMessage(charge, 'upcoming')
  assert.match(reminder, /Olá, Maria!/)
  assert.match(reminder, /vence em 21\/10\/2026/)
  assert.match(reminder, /ABC1D23/)
  const overdue = buildChargeMessage(charge, 'overdue')
  assert.match(overdue, /ainda está em aberto/)
})

test('paginação: 30 por página', () => {
  assert.equal(PAGE_SIZE, 30)
  assert.deepEqual(pageRange(1), { from: 0, to: 29 })
  assert.deepEqual(pageRange(2), { from: 30, to: 59 })
  assert.equal(totalPages(0), 1)
  assert.equal(totalPages(30), 1)
  assert.equal(totalPages(31), 2)
  assert.equal(totalPages(95), 4)
})

test('sanitizeSearchTerm remove caracteres que quebram o filtro', () => {
  assert.equal(sanitizeSearchTerm('  Maria, (Silva)%  '), 'Maria Silva')
  assert.equal(sanitizeSearchTerm(null), '')
})
