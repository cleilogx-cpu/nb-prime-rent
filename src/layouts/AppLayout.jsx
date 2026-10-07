import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LifeBuoy, LogOut, Menu, Settings, UserCircle2 } from 'lucide-react'
import Sidebar from '../components/Sidebar.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

const pageTitles = {
  '/': 'Dashboard',
  '/vehicles': 'Veículos',
  '/locations': 'Locações',
  '/payments': 'Recebimentos',
  '/recebimentos': 'Recebimentos',
  '/caucoes': 'Cauções',
  '/despesas': 'Custos',
  '/manutencao': 'Manutenção',
  '/historico': 'Histórico',
  '/ajuda': 'Ajuda e contato',
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const navigate = useNavigate()
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen((state) => !state)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#111111] text-[#D4AF37] transition hover:bg-white/5"
                  aria-label="Configurações"
                  aria-haspopup="menu"
                  aria-expanded={settingsOpen}
                >
                  <Settings size={18} />
                </button>
                {settingsOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-30 cursor-default"
                      onClick={() => setSettingsOpen(false)}
                      aria-label="Fechar configurações"
                    />
                    <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-white/10 bg-[#111111] p-2 shadow-2xl shadow-black/50">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSettingsOpen(false)
                          navigate('/ajuda')
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/5"
                      >
                        <LifeBuoy size={16} className="text-[#D4AF37]" />
                        Ajuda e contato
                      </button>
                    </div>
                  </>
                ) : null}
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
