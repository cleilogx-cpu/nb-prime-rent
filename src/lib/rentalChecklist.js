/**
 * Checklist operacional da locação -- pendências administrativas que não
 * bloqueiam contrato, financeiro nem ativação (só lembram o operador).
 *
 * Cada item vive em 3 colunas de `rentals`: `<key>` (boolean),
 * `<key>_at` (timestamptz) e `<key>_by` (e-mail de quem marcou). Pra
 * acrescentar um item novo no futuro: criar as 3 colunas e uma entrada
 * aqui -- a tela de detalhes, o Dashboard e o Histórico leem esta lista.
 */
export const CHECKLIST_ITEMS = [
  {
    key: 'crlv_shared',
    label: 'CRLV compartilhado com o locatário',
    pendingLabel: 'CRLV ainda não compartilhado',
  },
  {
    key: 'primary_driver_indicated',
    label: 'Locatário indicado como principal condutor',
    pendingLabel: 'Principal condutor ainda não indicado',
  },
  {
    key: 'primary_driver_accepted',
    label: 'Aceite do principal condutor confirmado',
    pendingLabel: 'Aguardando aceite do principal condutor',
  },
]

// null/undefined (locação antiga sem registro) conta como pendente.
export function isChecklistItemDone(rental, key) {
  return rental?.[key] === true
}

export function getPendingChecklistItems(rental) {
  return CHECKLIST_ITEMS.filter((item) => !isChecklistItemDone(rental, item.key))
}

export function isChecklistComplete(rental) {
  return getPendingChecklistItems(rental).length === 0
}

// Locação encerrada antes do checklist existir: as colunas ficam null (nunca
// foram preenchidas) -- o Histórico mostra "sem registro" em vez de ✕.
export function hasChecklistRecord(rental) {
  return CHECKLIST_ITEMS.some((item) => rental?.[item.key] !== null && rental?.[item.key] !== undefined)
}
