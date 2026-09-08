/**
 * Enums/valores fixos usados pelo app. Antes desta consolidação, esses
 * valores eram strings soltas repetidas (e às vezes digitadas de forma
 * levemente diferente) em vários arquivos. Novos enums (periodicidade, tipo
 * de recebimento, status de caução) entram aqui conforme cada PR seguinte
 * for implementando essas funcionalidades — não adiantar campos que ainda
 * não existem em nenhuma tela.
 */

// Status bruto gravado em `vehicles.status`. "Alugado" só é escrito pelo
// próprio sistema (contractsService.signContract / locationsService.endLocation)
// — nunca escolhido manualmente no formulário. "Manutenção" não é mais um
// valor deste campo: é a coluna independente `vehicles.maintenance`.
export const VEHICLE_STATUS = {
  DISPONIVEL: 'Disponível',
  ALUGADO: 'Alugado',
}

export const CONTRACT_STATUS = {
  RASCUNHO: 'Rascunho',
  ATIVO: 'Ativo',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado',
}

export const RENTAL_STATUS = {
  ATIVA: 'Ativa',
  ENCERRADA: 'Encerrada',
  CANCELADA: 'Cancelada',
}

// Periodicidade de cobrança do contrato (e da locação, que herda do
// contrato na assinatura). Substitui o "semanal" fixo de antes.
export const PERIODICITY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
}

export const PERIODICITY_LABELS = {
  [PERIODICITY.DAILY]: 'Diária',
  [PERIODICITY.WEEKLY]: 'Semanal',
  [PERIODICITY.BIWEEKLY]: 'Quinzenal',
  [PERIODICITY.MONTHLY]: 'Mensal',
}

// Recebimentos agora só admitem Aluguel ou Caução (seção 10 do pedido) --
// Transporte/Outro saem do formulário de criação, mas continuam existindo
// como valores possíveis em lançamentos antigos (o filtro/normalização em
// paymentsService.js já tolera qualquer um dos quatro).
export const RECEIPT_TYPE = {
  RENT: 'rent',
  DEPOSIT: 'deposit',
}

export const RECEIPT_TYPE_LABELS = {
  [RECEIPT_TYPE.RENT]: 'Aluguel',
  [RECEIPT_TYPE.DEPOSIT]: 'Caução',
}

// Status de contract_charges (cobranças/vencimentos).
export const CHARGE_STATUS = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
}

// Status de contract_deposits (caução).
export const DEPOSIT_STATUS = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  QUITADA: 'Quitada',
  A_DEVOLVER: 'A devolver',
  DEVOLVIDA: 'Devolvida',
}
