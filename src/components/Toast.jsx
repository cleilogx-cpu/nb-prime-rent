export default function Toast({ message, type = 'success', onClose }) {
  if (!message) {
    return null
  }

  const tone = type === 'error'
    ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
    : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'

  return (
    <div className={`fixed right-4 top-4 z-[60] max-w-md rounded-2xl border px-4 py-3 shadow-xl shadow-black/30 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm">{message}</p>
        <button type="button" onClick={onClose} className="text-sm font-semibold opacity-80">
          ×
        </button>
      </div>
    </div>
  )
}
