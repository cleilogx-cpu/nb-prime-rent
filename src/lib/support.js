export const SUPPORT_SUBJECTS = ['Dúvida', 'Sugestão', 'Relatar um problema']
export const SUPPORT_MESSAGE_MIN = 10
export const SUPPORT_MESSAGE_MAX = 2000

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim())
}

/**
 * URL da página de ajuda deste app no site central (Dúvidas frequentes).
 * Configurada por app via VITE_HELP_URL. Só vale URL http(s) bem formada --
 * qualquer outra coisa (vazia, "#", texto solto) devolve '' e o acesso fica
 * escondido, sem link fictício.
 */
export function getHelpUrl(raw) {
  const value = String(raw || '').trim()
  if (!value) {
    return ''
  }
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

/** Valida o formulário; devolve { campo: mensagem } (vazio = tudo certo). */
export function validateContactForm({ subject, message, replyEmail }) {
  const errors = {}
  if (!SUPPORT_SUBJECTS.includes(subject)) {
    errors.subject = 'Escolha um assunto.'
  }
  const trimmed = String(message || '').trim()
  if (!trimmed) {
    errors.message = 'Escreva sua mensagem.'
  } else if (trimmed.length < SUPPORT_MESSAGE_MIN) {
    errors.message = `Escreva pelo menos ${SUPPORT_MESSAGE_MIN} caracteres.`
  } else if (trimmed.length > SUPPORT_MESSAGE_MAX) {
    errors.message = `A mensagem pode ter no máximo ${SUPPORT_MESSAGE_MAX} caracteres.`
  }
  if (!isValidEmail(replyEmail)) {
    errors.replyEmail = 'Informe um e-mail válido para a resposta.'
  }
  return errors
}
