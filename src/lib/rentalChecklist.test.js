import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CHECKLIST_ITEMS,
  getPendingChecklistItems,
  hasChecklistRecord,
  isChecklistComplete,
} from './rentalChecklist.js'

test('locação nova (tudo false) tem as três pendências', () => {
  const rental = { crlv_shared: false, primary_driver_indicated: false, primary_driver_accepted: false }
  assert.equal(getPendingChecklistItems(rental).length, CHECKLIST_ITEMS.length)
  assert.equal(isChecklistComplete(rental), false)
})

test('só o aceite pendente deixa uma pendência', () => {
  const rental = { crlv_shared: true, primary_driver_indicated: true, primary_driver_accepted: false }
  const pending = getPendingChecklistItems(rental)
  assert.equal(pending.length, 1)
  assert.equal(pending[0].key, 'primary_driver_accepted')
})

test('três itens concluídos = checklist completo', () => {
  const rental = { crlv_shared: true, primary_driver_indicated: true, primary_driver_accepted: true }
  assert.equal(isChecklistComplete(rental), true)
})

test('null (locação antiga) conta como pendente e sem registro', () => {
  const rental = { crlv_shared: null, primary_driver_indicated: null, primary_driver_accepted: null }
  assert.equal(getPendingChecklistItems(rental).length, 3)
  assert.equal(hasChecklistRecord(rental), false)
  assert.equal(hasChecklistRecord({ crlv_shared: false }), true)
})
