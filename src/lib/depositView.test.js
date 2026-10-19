import test from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVE_VIEW, countDepositsToRefund, filterDeposits, isActiveRentalDeposit } from './depositView.js'

const make = (id, contractStatus, status, plate = 'AAA1A11', tenant = 'Fulano', number = 'NB-1') => ({
  id,
  status,
  contracts: { status: contractStatus, contract_number: number },
  vehicles: { plate },
  tenants: { full_name: tenant },
})

const deposits = [
  make('1', 'Ativo', 'Parcial', 'ABC1D23', 'Maria', 'NB-2026-0001'),
  make('2', 'Ativo', 'Pendente', 'XYZ9K88', 'João', 'NB-2026-0002'),
  make('3', 'Rascunho', 'Pendente', 'RAS0A00', 'Rascunho Silva', 'NB-2026-0003'),
  make('4', 'Cancelado', 'Pendente', 'CAN0A00', 'Cancelado Souza', 'NB-2026-0004'),
  make('5', 'Encerrado', 'A devolver', 'ENC1A11', 'Encerrado Lima', 'NB-2026-0005'),
  make('6', 'Encerrado', 'Devolvida', 'DEV1A11', 'Devolvido Costa', 'NB-2026-0006'),
]

test('visualização padrão: só cauções de locações ativas (nada de rascunho/cancelado)', () => {
  const view = filterDeposits(deposits)
  assert.deepEqual(view.map((item) => item.id), ['1', '2'])
  assert.equal(isActiveRentalDeposit(deposits[2]), false)
})

test('cauções de contratos não assinados continuam consultáveis (nada é apagado)', () => {
  assert.equal(filterDeposits(deposits, { view: '' }).length, 6)
  assert.deepEqual(filterDeposits(deposits, { view: 'Pendente' }).map((item) => item.id), ['2', '3', '4'])
})

test('filtro por status inclui históricos: A devolver e Devolvida', () => {
  assert.deepEqual(filterDeposits(deposits, { view: 'A devolver' }).map((item) => item.id), ['5'])
  assert.deepEqual(filterDeposits(deposits, { view: 'Devolvida' }).map((item) => item.id), ['6'])
})

test('busca por placa, locatário ou contrato vale sobre a visualização escolhida', () => {
  assert.deepEqual(filterDeposits(deposits, { view: ACTIVE_VIEW, search: 'abc1d23' }).map((item) => item.id), ['1'])
  assert.deepEqual(filterDeposits(deposits, { view: ACTIVE_VIEW, search: 'joão' }).map((item) => item.id), ['2'])
  assert.deepEqual(filterDeposits(deposits, { view: ACTIVE_VIEW, search: 'NB-2026-0002' }).map((item) => item.id), ['2'])
  assert.deepEqual(filterDeposits(deposits, { view: ACTIVE_VIEW, search: 'rascunho' }), [])
  assert.deepEqual(filterDeposits(deposits, { view: '', search: 'rascunho' }).map((item) => item.id), ['3'])
})

test('contagem de cauções a devolver', () => {
  assert.equal(countDepositsToRefund(deposits), 1)
  assert.equal(countDepositsToRefund([]), 0)
})
