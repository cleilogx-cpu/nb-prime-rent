export default function PlaceholderPage({ title, description }) {
  return (
    <div className="rounded-[32px] border border-white/10 bg-[#111111]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-10">
      <p className="text-sm uppercase tracking-[0.35em] text-[#D4AF37]">Em breve</p>
      <h2 className="mt-4 text-3xl font-semibold text-white">{title}</h2>
      <p className="mt-4 max-w-2xl text-slate-400">{description}</p>
      <div className="mt-8 rounded-[24px] border border-dashed border-white/15 bg-[#080808] p-8 text-slate-300">
        Este módulo será implementado como nova área de gestão de locação, com controle de registros, filtros e relatórios.
      </div>
    </div>
  )
}
