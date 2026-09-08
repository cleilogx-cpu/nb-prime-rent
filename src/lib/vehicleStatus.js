import { VEHICLE_STATUS } from './constants.js'

/**
 * O status "Alugado" nunca é escolhido manualmente — ele é ligado quando
 * existe contrato assinado/ativo pro veículo (contractsService.signContract)
 * e desligado ao encerrar a locação (locationsService.endLocation). A
 * manutenção é uma condição independente (checkbox no cadastro/edição do
 * veículo), que pode estar ligada ou desligada em qualquer um dos dois casos.
 *
 * Tabela de status exibido:
 *   Contrato ativo? | Manutenção? | Status exibido
 *   Não             | Não         | Disponível
 *   Não             | Sim         | Manutenção
 *   Sim             | Não         | Alugado
 *   Sim             | Sim         | Alugado / Manutenção
 */

export function isVehicleRented(vehicle) {
  return vehicle?.status === VEHICLE_STATUS.ALUGADO
}

export function isVehicleInMaintenance(vehicle) {
  return Boolean(vehicle?.maintenance)
}

export function isVehicleAvailable(vehicle) {
  return !isVehicleRented(vehicle) && !isVehicleInMaintenance(vehicle)
}

export function getVehicleDisplayStatus(vehicle) {
  const rented = isVehicleRented(vehicle)
  const maintenance = isVehicleInMaintenance(vehicle)

  if (rented && maintenance) {
    return 'Alugado / Manutenção'
  }

  if (rented) {
    return 'Alugado'
  }

  if (maintenance) {
    return 'Manutenção'
  }

  return 'Disponível'
}

/**
 * Contagens usadas no resumo de frota (Veículos/Dashboard). Um veículo
 * "Alugado / Manutenção" conta nas duas categorias — ele está mesmo nas
 * duas condições ao mesmo tempo — e nunca em "Disponíveis".
 */
export function summarizeVehicleStatuses(vehicles) {
  const list = vehicles ?? []

  let rentedCount = 0
  let availableCount = 0
  let maintenanceCount = 0

  for (const vehicle of list) {
    if (isVehicleRented(vehicle)) {
      rentedCount += 1
    }

    if (isVehicleInMaintenance(vehicle)) {
      maintenanceCount += 1
    }

    if (isVehicleAvailable(vehicle)) {
      availableCount += 1
    }
  }

  return { rentedCount, availableCount, maintenanceCount, totalCount: list.length }
}
