import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, UserCircle2 } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

const pageTitles = {
  '/': 'Dashboard',
  '/vehicles': 'Veículos',
  '/locations': 'Locações',
  '/payments': 'Recebimentos',
  '/recebimentos': 'Recebimentos',
  '/caucoes': 'Cauções',
  '/despesas': 'Despesas',
  '/manutencao': 'Manutenção',
  '/historico': 'Histórico',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { signOut, user } = useAuth()
  const currentTitle = pageTitles[location.pathname] || 'NB Prime Rent'

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="md:grid md:grid-cols-[290px_1fr]">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

        <div className="md:pl-0">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/10 bg-[#060606]/90 px-4 py-4 backdrop-blur-sm md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#111111] text-[#D4AF37] md:hidden"
                onClick={() => setSidebarOpen((state) => !state)}
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4AF37]">NB Prime Rent</p>
                <h1 className="text-lg font-semibold text-white">{currentTitle}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-[#111111] px-3 py-2 text-sm text-slate-300 sm:flex">
                <UserCircle2 size={18} className="text-[#D4AF37]" />
                <span className="max-w-[180px] truncate">{user?.email || 'Usuário'}</span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/20"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
