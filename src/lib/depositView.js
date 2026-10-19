import { CONTRACT_STATUS, DEPOSIT_STATUS } from './constants.js'

/** Valor do filtro de visualização: cauções das locações ativas (padrão). */
export const ACTIVE_VIEW = 'ativas'

/**
 * Caução "em acompanhamento": a do contrato Ativo (locação ativa, veículo
 * alugado). Contrato rascunho/cancelado/encerrado não entra aqui -- nada
 * é apagado, só deixa de aparecer na visualização padrão.
 */
export function isActiveRentalDeposit(deposit) {
  return deposit?.contracts?.status === CONTRACT_STATUS.ATIVO
}

/** Cauções que precisam ser devolvidas (locação encerrada com saldo recebido). */
export function countDepositsToRefund(deposits) {
  return (deposits ?? []).filter((deposit) => deposit.status === DEPOSIT_STATUS.A_DEVOLVER).length
}

/**
 * Filtro da tela de Cauções. `view`: ACTIVE_VIEW (padrão, locações ativas),
 * '' (todas) ou um status (Pendente, Parcial, Quitada, A devolver,
 * Devolvida -- aí inclui também os históricos). A busca (placa, locatário,
 * contrato) vale sobre a visualização escolhida.
 */
export function filterDeposits(deposits, { view = ACTIVE_VIEW, search = '' } = {}) {
  const term = String(search || '').trim().toLowerCase()

  return (deposits ?? []).filter((deposit) => {
    const matchesView = view === ACTIVE_VIEW ? isActiveRentalDeposit(deposit) : !view || deposit.status === view

    if (!matchesView) {
      return false
    }
    if (!term) {
      return true
    }

    const haystack = [deposit.vehicles?.plate, deposit.tenants?.full_name, deposit.contracts?.contract_number]
      .join(' ')
      .toLowerCase()
    return haystack.includes(term)
  })
}
