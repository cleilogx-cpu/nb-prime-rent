import { useState } from 'react'
import { Save } from 'lucide-react'
import { saveCompanySettings } from '../services/settingsService.js'
import { useCompany } from '../hooks/useCompany.js'

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/40 disabled:opacity-60'

function validate(fields, values) {
  const errors = {}
  fields.forEach((field) => {
    const raw = values[field.name]
    const text = String(raw ?? '').trim()

    if (field.required && !text) {
      errors[field.name] = 'Campo obrigatório.'
      return
    }
    if (field.type === 'number' && text) {
      const number = Number(text)
      if (Number.isNaN(number) || number < (field.min ?? 0) || number > (field.max ?? Infinity)) {
        errors[field.name] = `Informe um número entre ${field.min ?? 0} e ${field.max ?? '∞'}.`
      }
    }
    if (field.type === 'email' && text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      errors[field.name] = 'E-mail inválido.'
    }
  })
  return errors
}

/**
 * Seção genérica de Configurações (Dados da Empresa, Responsável, Regras,
 * Preferências): cada uma salva só os seus campos em company_settings.
 */
export default function SettingsSection({ title, description, fields, note }) {
  const { settings, reload } = useCompany()
  const [edits, setEdits] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const valueOf = (name) => edits[name] ?? settings[name] ?? ''

  const handleChange = (name, value) => {
    setEdits((current) => ({ ...current, [name]: value }))
    setMessage({ type: '', text: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) {
      return
    }

    const values = Object.fromEntries(fields.map((field) => [field.name, valueOf(field.name)]))
    const nextErrors = validate(fields, values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const patch = {}
    fields.forEach((field) => {
      const text = String(values[field.name] ?? '').trim()
      patch[field.name] = field.type === 'number' ? Number(text) : text || null
    })

    setSaving(true)
    const { error } = await saveCompanySettings(patch)
    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message || 'Não foi possível salvar. Confirme se você é administrador.' })
      return
    }

    await reload()
    setEdits({})
    setMessage({ type: 'success', text: 'Configurações salvas.' })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}
        {note ? <p className="mt-2 text-sm text-amber-200/80">{note}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className={`block space-y-2 ${field.wide ? 'sm:col-span-2' : ''}`}>
            <span className="text-sm text-slate-300">
              {field.label}
              {field.required ? ' *' : ''}
            </span>
            {field.type === 'textarea' ? (
              <textarea
                rows={3}
                value={valueOf(field.name)}
                onChange={(event) => handleChange(field.name, event.target.value)}
                disabled={saving}
                className={inputClass}
                placeholder={field.placeholder}
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                inputMode={field.type === 'number' ? 'decimal' : undefined}
                step={field.type === 'number' ? field.step ?? 'any' : undefined}
                value={valueOf(field.name)}
                onChange={(event) => handleChange(field.name, event.target.value)}
                onWheel={field.type === 'number' ? (event) => event.currentTarget.blur() : undefined}
                disabled={saving}
                className={`${inputClass} ${field.type === 'number' ? 'no-spinner' : ''}`}
                placeholder={field.placeholder}
                aria-invalid={Boolean(errors[field.name])}
              />
            )}
            {field.hint ? <span className="block text-xs text-slate-500">{field.hint}</span> : null}
            {errors[field.name] ? <span className="block text-sm text-rose-300">{errors[field.name]}</span> : null}
          </label>
        ))}
      </div>

      {message.text ? (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/15 px-5 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60 sm:w-auto"
      >
        <Save size={16} />
        {saving ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}
