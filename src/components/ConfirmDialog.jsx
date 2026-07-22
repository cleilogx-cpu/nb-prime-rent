export default function ConfirmDialog({ open, title, message, onCancel, onConfirm }) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/50">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-300/80">Confirmação</p>
        <h3 className="mt-3 text-2xl font-semibold text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl border border-rose-400/20 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200"
          >
            Confirmar exclusão
          </button>
        </div>
      </div>
    </div>
  )
}
