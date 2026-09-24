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

// Status de contract_charges (cobranças/vencimentos). CANCELADA_ENCERRAMENTO
// é usado quando a locação é encerrada (no prazo ou antecipadamente) --
// cobranças futuras que ainda não venceram viram esse status em vez de
// continuar Pendente pra sempre (o que faria elas aparecerem como atrasadas
// de uma locação que já acabou). Mantém a linha (auditoria/histórico do que
// estava previsto no contrato) em vez de apagar. CANCELADA genérico fica
// livre pra outro motivo de cancelamento que não seja encerramento de
// locação. listUpcomingCharges/listOverdueCharges só olham Pendente E, como
// proteção redundante, também exigem locação/contrato ativos -- então
// qualquer um dos dois status de cancelamento já tira a cobrança das duas
// listas do Dashboard.
export const CHARGE_STATUS = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  CANCELADA: 'Cancelada',
  CANCELADA_ENCERRAMENTO: 'Cancelada por encerramento da locação',
}

// Status de contract_deposits (caução).
export const DEPOSIT_STATUS = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  QUITADA: 'Quitada',
  A_DEVOLVER: 'A devolver',
  DEVOLVIDA: 'Devolvida',
}

// Tipos de arquivo do dossiê digital (contract_documents). Ordem aqui é a
// ordem de exibição no dossiê -- CNH/comprovante são enviados manualmente
// (ou pelo wizard), os demais são gerados/anexados automaticamente pelo
// próprio sistema nas fases seguintes (geração do contrato, assinatura).
export const DOCUMENT_TYPE = {
  CNH: 'cnh',
  COMPROVANTE_RESIDENCIA: 'comprovante_residencia',
  CONTRATO_GERADO_DOCX: 'contrato_gerado_docx',
  CONTRATO_GERADO_PDF: 'contrato_gerado_pdf',
  CONTRATO_ASSINADO_PDF: 'contrato_assinado_pdf',
  ASSINATURA_IMAGEM: 'assinatura_imagem',
}

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPE.CNH]: 'CNH',
  [DOCUMENT_TYPE.COMPROVANTE_RESIDENCIA]: 'Comprovante de residência',
  [DOCUMENT_TYPE.CONTRATO_GERADO_DOCX]: 'Contrato (Word)',
  [DOCUMENT_TYPE.CONTRATO_GERADO_PDF]: 'Contrato (PDF)',
  [DOCUMENT_TYPE.CONTRATO_ASSINADO_PDF]: 'Contrato assinado',
  [DOCUMENT_TYPE.ASSINATURA_IMAGEM]: 'Assinatura',
}

// Status de OCR de um documento (contract_documents.ocr_status).
export const OCR_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  NOT_APPLICABLE: 'not_applicable',
}

// Multa/juros padrão gravados em CADA contrato na criação (snapshot --
// contractsService.createContract grava esses valores nas colunas
// late_fee_percent/late_interest_percent_month do próprio contrato, nunca
// editável depois). Contratos antigos preservam o valor da época mesmo que
// este padrão mude no futuro -- mudar aqui só afeta contratos novos.
export const CONTRACT_DEFAULTS = {
  lateFeePercent: 10,
  lateInterestPercentMonth: 1,
}
