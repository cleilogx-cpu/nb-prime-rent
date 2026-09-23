import { buildWhatsAppLink } from '../lib/format.js'

/**
 * Ícone clicável que abre o WhatsApp do locatário em nova aba. Não renderiza
 * nada quando o telefone não é válido pra montar o link (evita um botão que
 * não leva a lugar nenhum).
 */
export default function WhatsAppLink({ phone, className = '' }) {
  const link = buildWhatsAppLink(phone)

  if (!link) {
    return null
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir no WhatsApp"
      className={`inline-flex items-center justify-center rounded-full p-1 text-emerald-400 transition hover:text-emerald-300 ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M12.02 2C6.5 2 2.02 6.48 2.02 12c0 1.86.5 3.6 1.37 5.1L2 22l5.06-1.33A9.96 9.96 0 0 0 12.02 22C17.54 22 22 17.52 22 12S17.54 2 12.02 2Zm5.86 14.24c-.25.7-1.24 1.28-2.02 1.44-.55.11-1.26.2-3.67-.79-3.08-1.28-5.06-4.4-5.21-4.6-.15-.2-1.24-1.65-1.24-3.15 0-1.5.77-2.23 1.05-2.53.27-.3.6-.37.8-.37.2 0 .4 0 .58.01.19.01.44-.07.68.53.25.6.85 2.1.92 2.25.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.44.53-.15.15-.3.31-.13.6.17.3.76 1.27 1.64 2.06 1.13 1.02 2.08 1.34 2.38 1.49.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.27.1 1.75.83 2.05 .98.3.15.5.23.57.36.08.13.08.75-.17 1.45Z" />
      </svg>
    </a>
  )
}
