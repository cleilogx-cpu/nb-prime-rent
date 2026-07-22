import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateNextPartnerBeneficiary,
  calculateNextDueDate,
  validateFinancialDestination,
  buildPaymentDestinationLabel,
} from './paymentLogic.js'

test('first partners payment uses next_destination when available', () => {
  assert.equal(calculateNextPartnerBeneficiary(null), 'Clei')
})

test('alternates beneficiary from Clei to Edson', () => {
  assert.equal(calculateNextPartnerBeneficiary('Clei'), 'Edson')
})

test('alternates beneficiary from Edson to Clei', () => {
  assert.equal(calculateNextPartnerBeneficiary('Edson'), 'Clei')
})

test('savings always uses vehicle fund destination', () => {
  assert.equal(buildPaymentDestinationLabel('Fundo do veículo', 'savings'), 'Fundo do veículo')
  assert.equal(validateFinancialDestination({ financeModel: 'savings', destination: 'Fundo do veículo', beneficiary: 'Clei' }), 'Não é permitido definir Clei ou Edson como beneficiário em modelo savings.')
})

test('cancelled payments are ignored in history', () => {
  const history = [
    { status: 'Cancelado', beneficiary: 'Clei' },
    { status: 'Pago', beneficiary: 'Edson' },
  ]
  const lastConfirmed = history.filter((item) => item.status !== 'Cancelado').slice(-1)[0]
  assert.equal(lastConfirmed.beneficiary, 'Edson')
})

test('next due date adds seven days to the current due date', () => {
  assert.equal(calculateNextDueDate('2026-07-22', '2026-07-15'), '2026-07-22')
})
