import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login() {
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4">
        <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#111111]/95 px-8 py-14 text-center text-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
            <ShieldCheck size={26} />
          </div>
          <p className="mt-6 text-sm uppercase tracking-[0.35em] text-[#D4AF37]">NB Prime Rent</p>
          <p className="mt-4 text-lg font-semibold text-white">Carregando sessão...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setSubmitting(false)

    if (error) {
  console.error('Erro do Supabase:', error)
  setErrorMessage(`${error.message} — código: ${error.code || 'sem código'}`)
  return
}
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#111111]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
            <ShieldCheck size={30} />
          </div>
          <p className="mt-5 text-sm uppercase tracking-[0.35em] text-[#D4AF37]">NB Prime Rent</p>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Gestão de Locação de Veículos</h1>
          <p className="mt-3 text-sm text-slate-400">Acesse o painel para acompanhar sua frota e finanças com clareza.</p>
          <p className="mt-2 text-sm text-[#D4AF37]">Capital inteligente. Crescimento consistente.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200">
            E-mail
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-3">
              <Mail size={18} className="text-[#D4AF37]" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="seu@email.com"
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-200">
            Senha
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-3">
              <Lock size={18} className="text-[#D4AF37]" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="••••••••••"
              />
            </div>
          </label>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0b0b0b] transition hover:bg-[#e5c55c] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  )
}
