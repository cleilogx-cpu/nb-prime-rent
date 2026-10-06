import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { updateChecklistItem } from '../services/locationsService.js'
import { CHECKLIST_ITEMS, hasChecklistRecord, isChecklistItemDone } from '../lib/rentalChecklist.js'

function formatDateTime(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  const day = date.toLocaleDateString('pt-BR')
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${day} às ${time}`
}

/**
 * Checklist operacional da locação (Locações > Ver detalhes, e Histórico em
 * modo somente leitura). Não bloqueia nada -- só registra o que já foi
 * feito. Cada linha é um botão grande (fácil de tocar no celular).
 */
export default function RentalChecklist({ rental, readOnly = false, onUpdated, highlight = false }) {
  const [savingKey, setSavingKey] = useState('')
  const [error, setError] = useState('')

  const handleToggle = async (item) => {
    if (readOnly || savingKey) {
      return
    }

    setSavingKey(item.key)
    setError('')

    const { data, error: updateError } = await updateChecklistItem(rental.id, item.key, !isChecklistItemDone(rental, item.key))

    setSavingKey('')

    if (updateError || !data) {
      setError(updateError?.message || 'Não foi possível atualizar o checklist.')
      return
    }

    onUpdated?.(data)
  }

  const noRecord = readOnly && !hasChecklistRecord(rental)

  return (
    <div
      id={readOnly ? undefined : 'checklist-locacao'}
      className={`rounded-[24px] border bg-slate-900/70 p-5 transition ${
        highlight ? 'border-amber-300/50 ring-2 ring-amber-300/30' : 'border-white/10'
      }`}
    >
      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Checklist da locação</p>

      {noRecord ? (
        <p className="mt-4 text-sm text-slate-400">Sem registro — locação encerrada antes do checklist existir.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {CHECKLIST_ITEMS.map((item) => {
            const done = isChecklistItemDone(rental, item.key)
            const at = rental[`${item.key}_at`]
            const by = rental[`${item.key}_by`]
            const Row = readOnly ? 'div' : 'button'

            return (
              <Row
                key={item.key}
                {...(readOnly
                  ? {}
                  : {
                      type: 'button',
                      role: 'checkbox',
                      'aria-checked': done,
                      disabled: savingKey === item.key,
                      onClick: () => handleToggle(item),
                    })}
                className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border p-3 text-left ${
                  done ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-white/10 bg-slate-950/60'
                } ${readOnly ? '' : 'transition hover:border-amber-300/30 disabled:opacity-60'}`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    done ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200' : 'border-amber-300/30 text-amber-300'
                  }`}
                >
                  {done ? <Check size={16} /> : <AlertTriangle size={14} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-white">{item.label}</span>
                  <span className={`mt-1 block text-xs ${done ? 'text-emerald-300/90' : 'text-amber-300/90'}`}>
                    {done
                      ? `✓ Concluído${at ? ` em ${formatDateTime(at)}` : ''}${by ? ` · ${by}` : ''}`
                      : readOnly
                        ? '✕ Não concluído'
                        : '⚠ Pendente'}
                  </span>
                </span>
              </Row>
            )
          })}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}
