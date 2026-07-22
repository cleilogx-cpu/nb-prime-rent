export default function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center text-slate-200 shadow-lg shadow-black/30">
      <div>
        <div className="mb-4 inline-flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-amber-300/20 text-amber-300">
          <span className="text-xl font-bold">NB</span>
        </div>
        <p className="text-lg font-semibold">Carregando dados do painel...</p>
        <p className="mt-2 text-sm text-slate-400">Aguarde enquanto conectamos ao Supabase.</p>
      </div>
    </div>
  )
}
