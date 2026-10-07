import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Eye, FilePlus2, Pencil, Save, Trash2 } from 'lucide-react'
import ContractMinutaView from './ContractMinutaView.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { useCompany } from '../hooks/useCompany.js'
import {
  BLOCK_TYPES,
  BLOCK_TYPE_LABELS,
  PLACEHOLDER_GROUPS,
  SAMPLE_CONTRACT,
  newBlockId,
  numberBlocks,
  renderTemplate,
  validateTemplateContent,
} from '../lib/contractTemplate.js'
import {
  TEMPLATE_STATUS,
  activateTemplate,
  createTemplateDraft,
  discardTemplateDraft,
  listTemplateVersions,
  saveTemplateDraft,
} from '../services/contractTemplatesService.js'
import { formatDate } from '../lib/format.js'

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/40 disabled:opacity-60'
const buttonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5 disabled:opacity-60'
const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/25 disabled:opacity-60'

// Ponto de partida neutro (sem nada de nenhuma empresa) pra quem ainda não
// tem nenhum modelo -- a empresa escreve o resto com o construtor.
const STARTER_CONTENT = {
  header: {
    kicker: 'LOCAÇÃO DE VEÍCULOS',
    title: 'CONTRATO DE LOCAÇÃO DE VEÍCULO',
    subtitle: 'Instrumento Particular de Locação de Veículo [MARCA/MODELO]',
    date: '[DATA DE INÍCIO]',
    heading: '',
  },
  blocks: [
    { id: 'starter-1', type: BLOCK_TYPES.HEADING, text: 'Das partes' },
    { id: 'starter-2', type: BLOCK_TYPES.TEXT, text: 'LOCADOR: [NOME DO LOCADOR], CPF nº [CPF DO LOCADOR], Endereço [ENDEREÇO DO LOCADOR].' },
    { id: 'starter-3', type: BLOCK_TYPES.TEXT, text: 'LOCATÁRIO: [NOME DO LOCATÁRIO], CPF nº [CPF DO LOCATÁRIO], Endereço [ENDEREÇO DO LOCATÁRIO].' },
    { id: 'starter-4', type: BLOCK_TYPES.HEADING, text: 'Do objeto' },
    { id: 'starter-5', type: BLOCK_TYPES.CLAUSE, text: 'O LOCADOR entrega ao LOCATÁRIO o veículo [VEÍCULO], placa [PLACA], pelo valor de [VALOR DA LOCAÇÃO], com periodicidade [PERIODICIDADE].' },
    { id: 'starter-6', type: BLOCK_TYPES.CLOSING, text: 'Local e data: [DATA DE INÍCIO]' },
  ],
}

function statusStyle(status) {
  if (status === TEMPLATE_STATUS.ACTIVE) return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
  if (status === TEMPLATE_STATUS.DRAFT) return 'border-amber-300/20 bg-amber-300/10 text-amber-200'
  return 'border-slate-400/20 bg-slate-500/10 text-slate-300'
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${statusStyle(status)}`}>
      {status}
    </span>
  )
}

function FieldSelect({ onPick, label = 'Inserir campo…' }) {
  return (
    <select
      value=""
      onChange={(event) => {
        if (event.target.value) {
          onPick(event.target.value)
        }
      }}
      className="min-h-11 rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
      aria-label={label}
    >
      <option value="">{label}</option>
      {PLACEHOLDER_GROUPS.map((group) => (
        <optgroup key={group.key} label={`${group.label} — ${group.source}`}>
          {group.fields.map((field) => (
            <option key={field.token} value={field.token}>
              {`[${field.token}]`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

/**
 * Configurações → Modelo de Contrato: o construtor. Rascunho é editável;
 * depois de validado vira o modelo ATIVO e não muda mais -- alterar = nova
 * versão (cópia em rascunho). Contratos já gerados ficam presos à versão
 * que usaram.
 */
export default function ContractTemplateEditor() {
  const { settings } = useCompany()
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('overview') // overview | edit | review | view
  const [draft, setDraft] = useState(null)
  const [content, setContent] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [previewMode, setPreviewMode] = useState('values')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [confirm, setConfirm] = useState(null) // { kind, blockId? }
  const textareaRefs = useRef({})

  const active = useMemo(() => versions.find((item) => item.status === TEMPLATE_STATUS.ACTIVE) || null, [versions])
  const existingDraft = useMemo(() => versions.find((item) => item.status === TEMPLATE_STATUS.DRAFT) || null, [versions])

  const load = useCallback(async () => {
    const { data, error } = await listTemplateVersions()
    if (error) {
      setMessage({ type: 'error', text: error.message || 'Não foi possível carregar os modelos.' })
    }
    setVersions(data)
    setLoading(false)
    return data
  }, [])

  useEffect(() => {
    let cancelled = false
    listTemplateVersions().then(({ data, error }) => {
      if (cancelled) {
        return
      }
      if (error) {
        setMessage({ type: 'error', text: error.message || 'Não foi possível carregar os modelos.' })
      }
      setVersions(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const fail = (error, fallback) => setMessage({ type: 'error', text: error?.message || fallback })

  const openDraft = (template) => {
    setDraft(template)
    setContent(template.content)
    setDirty(false)
    setMode('edit')
    setMessage({ type: '', text: '' })
  }

  const handleStartEditing = async () => {
    setBusy(true)
    setMessage({ type: '', text: '' })

    if (existingDraft) {
      openDraft(existingDraft)
      setBusy(false)
      return
    }

    const { data, error } = await createTemplateDraft({
      basedOnVersion: active?.version ?? null,
      content: active ? null : STARTER_CONTENT,
    })
    setBusy(false)

    if (error || !data) {
      fail(error, 'Não foi possível criar a nova versão do modelo.')
      return
    }

    await load()
    openDraft(data)
  }

  const updateContent = (updater) => {
    setContent((current) => updater(current))
    setDirty(true)
    setMessage({ type: '', text: '' })
  }

  const updateHeader = (field, value) => updateContent((current) => ({ ...current, header: { ...current.header, [field]: value } }))

  const updateBlock = (id, patch) =>
    updateContent((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    }))

  const addBlock = (type, afterId = null) =>
    updateContent((current) => {
      const block = { id: newBlockId(), type, text: '', ...(type === BLOCK_TYPES.CLAUSE ? { title: '' } : {}) }
      const index = afterId ? current.blocks.findIndex((item) => item.id === afterId) : -1
      const blocks = [...current.blocks]
      blocks.splice(index >= 0 ? index + 1 : blocks.length, 0, block)
      return { ...current, blocks }
    })

  const moveBlock = (id, direction) =>
    updateContent((current) => {
      const index = current.blocks.findIndex((item) => item.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.blocks.length) {
        return current
      }
      const blocks = [...current.blocks]
      ;[blocks[index], blocks[target]] = [blocks[target], blocks[index]]
      return { ...current, blocks }
    })

  const removeBlock = (id) => updateContent((current) => ({ ...current, blocks: current.blocks.filter((block) => block.id !== id) }))

  const insertToken = (block, token) => {
    const element = textareaRefs.current[block.id]
    const text = block.text || ''
    const start = element?.selectionStart ?? text.length
    const end = element?.selectionEnd ?? start
    const insert = `[${token}]`
    updateBlock(block.id, { text: `${text.slice(0, start)}${insert}${text.slice(end)}` })
    requestAnimationFrame(() => {
      element?.focus()
      element?.setSelectionRange(start + insert.length, start + insert.length)
    })
  }

  const handleSave = async () => {
    setBusy(true)
    const { data, error } = await saveTemplateDraft(draft.id, content)
    setBusy(false)

    if (error || !data) {
      fail(error, 'Não foi possível salvar o rascunho.')
      return false
    }

    setDraft(data)
    setDirty(false)
    setMessage({ type: 'success', text: 'Rascunho salvo.' })
    await load()
    return true
  }

  const handleGoReview = async () => {
    if (dirty && !(await handleSave())) {
      return
    }
    setPreviewMode('values')
    setMode('review')
  }

  const handleActivate = async () => {
    setConfirm(null)
    setBusy(true)
    const { data, error } = await activateTemplate(draft.id)
    setBusy(false)

    if (error || !data) {
      fail(error, 'Não foi possível validar o modelo.')
      return
    }

    await load()
    setDraft(null)
    setContent(null)
    setMode('overview')
    setMessage({ type: 'success', text: `Modelo versão ${data.version} validado e ativo. Ele será usado nos próximos contratos.` })
  }

  const handleDiscard = async () => {
    setConfirm(null)
    setBusy(true)
    const { error } = await discardTemplateDraft(draft.id)
    setBusy(false)

    if (error) {
      fail(error, 'Não foi possível descartar o rascunho.')
      return
    }

    await load()
    setDraft(null)
    setContent(null)
    setMode('overview')
    setMessage({ type: 'success', text: 'Rascunho descartado. O modelo ativo continua o mesmo.' })
  }

  const numbered = useMemo(() => (content ? numberBlocks(content.blocks) : []), [content])

  const previewTemplate = mode === 'view' ? viewing?.content : content
  const preview = useMemo(
    () => (previewTemplate ? renderTemplate(previewTemplate, { contract: SAMPLE_CONTRACT, settings, mode: previewMode }) : null),
    [previewTemplate, settings, previewMode],
  )
  const problems = useMemo(() => (content ? validateTemplateContent(content) : []), [content])

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando…</p>
  }

  const messageBox = message.text ? (
    <p
      role={message.type === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border px-4 py-3 text-sm ${
        message.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
      }`}
    >
      {message.text}
    </p>
  ) : null

  const previewToggle = (
    <div className="inline-flex rounded-2xl border border-white/10 bg-slate-900 p-1 text-sm">
      {[
        { key: 'values', label: 'Com dados de exemplo' },
        { key: 'tokens', label: 'Mostrar campos' },
      ].map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => setPreviewMode(option.key)}
          className={`rounded-xl px-3 py-2 ${previewMode === option.key ? 'bg-amber-300/15 text-amber-200' : 'text-slate-400'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )

  // ---------- Visão geral ----------
  if (mode === 'overview') {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-xl font-semibold text-white">Modelo de Contrato</h3>
          <p className="mt-2 text-sm text-slate-400">
            Monte o texto do contrato uma vez. Os campos entre colchetes, como [NOME DO LOCATÁRIO], são trocados
            automaticamente pelos dados de cada contrato. Alterar um modelo já validado cria uma nova versão — os
            contratos antigos continuam com o texto que tinham.
          </p>
        </div>

        {messageBox}

        <div className="rounded-[24px] border border-white/10 bg-slate-900/70 p-5">
          {active ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Modelo em uso</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
                  Versão {active.version} <StatusBadge status={active.status} />
                </p>
                {active.validated_at ? <p className="mt-1 text-xs text-slate-500">Validado em {formatDate(active.validated_at.slice(0, 10))}</p> : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className={buttonClass} onClick={() => { setViewing(active); setPreviewMode('values'); setMode('view') }}>
                  <Eye size={16} />
                  Visualizar
                </button>
                <button type="button" className={primaryButtonClass} disabled={busy} onClick={handleStartEditing}>
                  <Pencil size={16} />
                  {existingDraft ? 'Continuar rascunho' : 'Editar (criar nova versão)'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-amber-200">
                Nenhum modelo ativo ainda. Sem um modelo ativo não é possível gerar contratos.
              </p>
              <button type="button" className={primaryButtonClass} disabled={busy} onClick={handleStartEditing}>
                <FilePlus2 size={16} />
                {existingDraft ? 'Continuar rascunho' : 'Criar modelo'}
              </button>
            </div>
          )}
          {active && existingDraft ? (
            <p className="mt-3 text-xs text-slate-400">Há um rascunho (versão {existingDraft.version}) em andamento — ele não é usado nos contratos até ser validado.</p>
          ) : null}
        </div>

        {versions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Versões</p>
            {versions.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2 text-slate-200">
                  Versão {item.version} <StatusBadge status={item.status} />
                  {item.validated_at ? <span className="text-xs text-slate-500">validado em {formatDate(item.validated_at.slice(0, 10))}</span> : null}
                </span>
                {item.status === TEMPLATE_STATUS.DRAFT ? null : (
                  <button type="button" className={buttonClass} onClick={() => { setViewing(item); setPreviewMode('values'); setMode('view') }}>
                    <Eye size={14} />
                    Visualizar
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  // ---------- Visualizar versão (somente leitura) ----------
  if (mode === 'view' && viewing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className={buttonClass} onClick={() => setMode('overview')}>
            <ArrowLeft size={16} />
            Voltar
          </button>
          <p className="flex items-center gap-2 text-sm text-slate-300">
            Versão {viewing.version} <StatusBadge status={viewing.status} />
          </p>
        </div>
        {previewToggle}
        <ContractMinutaView sections={preview?.sections} />
      </div>
    )
  }

  // ---------- Revisar modelo ----------
  if (mode === 'review' && content) {
    const blocking = problems.length > 0
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Revisar modelo de contrato</h3>
          <p className="mt-2 text-sm text-slate-400">
            Confira estrutura, textos, ordem e campos antes de validar. Ao validar, a versão {draft.version} passa a ser
            o modelo ativo.
          </p>
        </div>

        {messageBox}

        {blocking ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p className="font-semibold">Ajuste antes de validar:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Nenhum problema encontrado no modelo.
          </p>
        )}

        {previewToggle}
        <ContractMinutaView sections={preview?.sections} maxHeightClass="max-h-[65vh]" />

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={buttonClass} onClick={() => setMode('edit')}>
            <ArrowLeft size={16} />
            Voltar e editar
          </button>
          <button type="button" className={primaryButtonClass} disabled={blocking || busy} onClick={() => setConfirm({ kind: 'activate' })}>
            <CheckCircle2 size={16} />
            Validar modelo
          </button>
        </div>

        <ConfirmDialog
          open={confirm?.kind === 'activate'}
          title="Validar modelo"
          message={`A versão ${draft.version} passa a ser o modelo ativo e será usada nos próximos contratos. Contratos já gerados não são alterados.`}
          confirmLabel="Validar modelo"
          onCancel={() => setConfirm(null)}
          onConfirm={handleActivate}
        />
      </div>
    )
  }

  // ---------- Edição do rascunho ----------
  if (mode === 'edit' && content && draft) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-white">Construir modelo — versão {draft.version}</h3>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
              <StatusBadge status={TEMPLATE_STATUS.DRAFT} />
              {dirty ? <span className="text-amber-200">Alterações não salvas</span> : <span>Tudo salvo</span>}
            </p>
          </div>
          <button type="button" className={buttonClass} onClick={() => (dirty ? setConfirm({ kind: 'leave' }) : setMode('overview'))}>
            <ArrowLeft size={16} />
            Sair da edição
          </button>
        </div>

        {messageBox}

        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 sm:col-span-2">Cabeçalho do contrato</p>
          {[
            { key: 'kicker', label: 'Linha acima do título' },
            { key: 'title', label: 'Título', multiline: true },
            { key: 'subtitle', label: 'Subtítulo' },
            { key: 'date', label: 'Data exibida no topo' },
            { key: 'heading', label: 'Título principal do texto' },
          ].map((field) => (
            <label key={field.key} className={`block space-y-1 ${field.multiline ? 'sm:col-span-2' : ''}`}>
              <span className="text-sm text-slate-300">{field.label}</span>
              {field.multiline ? (
                <textarea rows={2} value={content.header?.[field.key] || ''} onChange={(event) => updateHeader(field.key, event.target.value)} className={inputClass} />
              ) : (
                <input value={content.header?.[field.key] || ''} onChange={(event) => updateHeader(field.key, event.target.value)} className={inputClass} />
              )}
            </label>
          ))}
        </div>

        <div className="space-y-3">
          {numbered.map((block, index) => (
            <div key={block.id} className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  {block.label || BLOCK_TYPE_LABELS[block.type]}
                </span>
                <select
                  value={block.type}
                  onChange={(event) => updateBlock(block.id, { type: event.target.value })}
                  className="min-h-11 rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
                  aria-label="Tipo do item"
                >
                  {Object.values(BLOCK_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {BLOCK_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" className={buttonClass} disabled={index === 0} onClick={() => moveBlock(block.id, -1)} aria-label="Mover para cima">
                    <ArrowUp size={16} />
                  </button>
                  <button type="button" className={buttonClass} disabled={index === numbered.length - 1} onClick={() => moveBlock(block.id, 1)} aria-label="Mover para baixo">
                    <ArrowDown size={16} />
                  </button>
                  <button type="button" className={`${buttonClass} text-rose-200`} onClick={() => setConfirm({ kind: 'delete', blockId: block.id })} aria-label="Excluir item">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {block.type === BLOCK_TYPES.CLAUSE ? (
                <input
                  value={block.title || ''}
                  onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                  placeholder="Título da cláusula (opcional), ex.: Do objeto"
                  className={`${inputClass} mt-3`}
                />
              ) : null}

              <textarea
                ref={(element) => {
                  if (element) {
                    textareaRefs.current[block.id] = element
                  }
                }}
                rows={block.type === BLOCK_TYPES.HEADING ? 1 : 4}
                value={block.text || ''}
                onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                placeholder={block.type === BLOCK_TYPES.HEADING ? 'Ex.: Das partes' : 'Texto…'}
                className={`${inputClass} mt-3`}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <FieldSelect onPick={(token) => insertToken(block, token)} />
                <select
                  value=""
                  onChange={(event) => {
                    if (event.target.value) {
                      addBlock(event.target.value, block.id)
                    }
                  }}
                  className="min-h-11 rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none"
                  aria-label="Adicionar abaixo"
                >
                  <option value="">+ Adicionar abaixo…</option>
                  {Object.values(BLOCK_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {BLOCK_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={() => addBlock(BLOCK_TYPES.CLAUSE)}>+ Adicionar cláusula</button>
          <button type="button" className={buttonClass} onClick={() => addBlock(BLOCK_TYPES.PARAGRAPH)}>+ Adicionar parágrafo</button>
          <button type="button" className={buttonClass} onClick={() => addBlock(BLOCK_TYPES.ITEM)}>+ Adicionar alínea</button>
          <button type="button" className={buttonClass} onClick={() => addBlock(BLOCK_TYPES.HEADING)}>+ Título de seção</button>
          <button type="button" className={buttonClass} onClick={() => addBlock(BLOCK_TYPES.TEXT)}>+ Texto livre</button>
        </div>

        <p className="text-xs text-slate-500">
          A numeração (cláusulas, parágrafos § e alíneas a, b, c) é automática e se ajusta quando você reordena.
          Referências a outras cláusulas escritas no texto (ex.: “conforme a cláusula 17ª”) precisam ser conferidas se a ordem mudar.
          Para a lista de cobranças use um “Texto livre” só com o campo [CRONOGRAMA DE PAGAMENTOS].
        </p>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-4 sm:flex-row sm:flex-wrap sm:justify-between">
          <button type="button" className={`${buttonClass} text-rose-200`} disabled={busy} onClick={() => setConfirm({ kind: 'discard' })}>
            <Trash2 size={16} />
            Descartar rascunho
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className={buttonClass} disabled={busy} onClick={handleSave}>
              <Save size={16} />
              Salvar rascunho
            </button>
            <button type="button" className={buttonClass} disabled={busy} onClick={async () => { if (dirty && !(await handleSave())) return; setPreviewMode('values'); setMode('review') }}>
              <Eye size={16} />
              Visualizar modelo
            </button>
            <button type="button" className={primaryButtonClass} disabled={busy} onClick={handleGoReview}>
              Revisar modelo
            </button>
          </div>
        </div>

        <ConfirmDialog
          open={confirm?.kind === 'delete'}
          title="Excluir item"
          message="Excluir este item do modelo? (O rascunho só muda de verdade quando você salvar.)"
          confirmLabel="Excluir"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            removeBlock(confirm.blockId)
            setConfirm(null)
          }}
        />
        <ConfirmDialog
          open={confirm?.kind === 'discard'}
          title="Descartar rascunho"
          message="Descartar esta versão em rascunho? O modelo ativo continua exatamente como está."
          confirmLabel="Descartar"
          onCancel={() => setConfirm(null)}
          onConfirm={handleDiscard}
        />
        <ConfirmDialog
          open={confirm?.kind === 'leave'}
          title="Sair sem salvar"
          message="Há alterações não salvas neste rascunho. Sair agora descarta essas alterações (o rascunho salvo anteriormente continua)."
          confirmLabel="Sair sem salvar"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirm(null)
            await load()
            setMode('overview')
          }}
        />
      </div>
    )
  }

  return null
}
