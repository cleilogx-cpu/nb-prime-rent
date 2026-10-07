import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ExternalLink, HelpCircle, Send } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { sendContactMessage } from '../services/supportService.js'
import {
  SUPPORT_MESSAGE_MAX,
  SUPPORT_SUBJECTS,
  getHelpUrl,
  validateContactForm,
} from '../lib/support.js'

const FAILURE_MESSAGE = 'Não foi possível enviar sua mensagem. Por favor, tente novamente.'
const SUCCESS_MESSAGE = 'Mensagem enviada com sucesso! Obrigado pelo contato. Em breve, retornarei pelo e-mail informado.'
const inputClass =
  'w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37]/40 disabled:opacity-60'

export default function Help() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const helpUrl = getHelpUrl(import.meta.env.VITE_HELP_URL)

  const [subject, setSubject] = useState('')
  // null = ainda não mexeu: segue o e-mail da conta; texto = o que o usuário digitou.
  const [typedEmail, setTypedEmail] = useState(null)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sent, setSent] = useState(false)

  const replyEmail = typedEmail ?? user?.email ?? ''

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (sending) {
      return
    }

    const validation = validateContactForm({ subject, message, replyEmail })
    setErrors(validation)
    setFailed(false)

    if (Object.keys(validation).length > 0) {
      return
    }

    setSending(true)
    const { error } = await sendContactMessage({ subject, message: message.trim(), replyEmail: replyEmail.trim() })
    setSending(false)

    if (error) {
      // Falha: não mostra sucesso e mantém tudo que foi digitado.
      setFailed(true)
      return
    }

    setSubject('')
    setMessage('')
    setTypedEmail(null)
    setErrors({})
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111111] px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/5"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>

      <div className="rounded-[32px] border border-white/10 bg-[#111111]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-[#D4AF37]">Ajuda e contato</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Fale conosco</h2>
        <p className="mt-2 text-sm text-slate-400">
          Não coloque senhas, dados de pacientes, clientes ou outras informações sensíveis na mensagem.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Assunto *</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={sending}
              className={inputClass}
              aria-invalid={Boolean(errors.subject)}
            >
              <option value="">Selecione…</option>
              {SUPPORT_SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            {errors.subject ? <span className="block text-sm text-rose-300">{errors.subject}</span> : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Mensagem *</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={sending}
              rows={6}
              maxLength={SUPPORT_MESSAGE_MAX}
              placeholder="Conte sua dúvida, sugestão ou dificuldade ao utilizar o aplicativo"
              className={`${inputClass} resize-y`}
              aria-invalid={Boolean(errors.message)}
            />
            {errors.message ? <span className="block text-sm text-rose-300">{errors.message}</span> : null}
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-slate-300">E-mail para resposta *</span>
            <input
              type="email"
              value={replyEmail}
              onChange={(event) => setTypedEmail(event.target.value)}
              disabled={sending}
              autoComplete="email"
              className={inputClass}
              aria-invalid={Boolean(errors.replyEmail)}
            />
            {errors.replyEmail ? <span className="block text-sm text-rose-300">{errors.replyEmail}</span> : null}
          </label>

          {failed ? (
            <p role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {FAILURE_MESSAGE}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/15 px-5 py-3 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <Send size={16} />
            {sending ? 'Enviando…' : 'Enviar mensagem'}
          </button>
        </form>
      </div>

      {helpUrl ? (
        <div className="rounded-[32px] border border-white/10 bg-[#111111]/90 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="text-[#D4AF37]" />
            <h3 className="text-lg font-semibold text-white">Dúvidas frequentes</h3>
          </div>
          <p className="mt-2 text-sm text-slate-400">Veja respostas para as perguntas mais comuns sobre este aplicativo.</p>
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/5"
          >
            Abrir página de ajuda
            <ExternalLink size={14} />
          </a>
        </div>
      ) : null}

      {sent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
            <CheckCircle2 size={28} className="text-emerald-300" />
            <p className="mt-4 text-base leading-7 text-white">{SUCCESS_MESSAGE}</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-6 min-h-12 w-full rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/15 px-5 py-3 text-sm font-semibold text-[#D4AF37]"
            >
              Entendi
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
