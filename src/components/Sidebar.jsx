import { NavLink } from 'react-router-dom'
import {
  Clock3,
  DollarSign,
  FileText,
  Home,
  ShieldCheck,
  Truck,
  Wrench,
  X,
  BadgeCheck,
} from 'lucide-react'

const menuItems = [
  { label: 'Dashboard', to: '/', icon: Home },
  { label: 'Veículos', to: '/vehicles', icon: Truck },
  { label: 'Locações', to: '/locations', icon: BadgeCheck },
  { label: 'Contratos', to: '/contracts', icon: FileText },
  { label: 'Recebimentos', to: '/payments', icon: DollarSign },
  { label: 'Cauções', to: '/caucoes', icon: ShieldCheck },
  { label: 'Despesas', to: '/despesas', icon: FileText },
  { label: 'Manutenção', to: '/manutencao', icon: Wrench },
  { label: 'Histórico', to: '/historico', icon: Clock3 },
]

export default function Sidebar({ open, setOpen }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-[290px] flex-col border-r border-white/10 bg-[#080808] px-4 py-5 shadow-[12px_0_40px_rgba(0,0,0,0.25)] transition duration-300 md:static md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between gap-3 pb-5 md:hidden">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4AF37]">NB Prime Rent</p>
          <p className="text-xl font-semibold text-white">Gestão</p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[#111111] text-[#D4AF37]"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-6 rounded-[24px] border border-[#D4AF37]/15 bg-[#111111] p-4">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#D4AF37]">NB Prime Rent</p>
        <h2 className="mt-3 text-xl font-semibold text-white">Gestão de Locação</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Capital inteligente. Crescimento consistente.
        </p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
