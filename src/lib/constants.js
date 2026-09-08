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
