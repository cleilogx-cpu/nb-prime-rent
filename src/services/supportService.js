import { supabase } from '../lib/supabaseClient.js'

/**
 * Envia o "Fale conosco" pela função de servidor api/support/contact.js
 * (que usa a chave do serviço de e-mail -- nunca exposta aqui). Só devolve
 * sucesso quando o servidor confirmou o envio; qualquer outra coisa é erro.
 */
export async function sendContactMessage({ subject, message, replyEmail }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token

  if (!accessToken) {
    return { error: { message: 'Sessão expirada.' } }
  }

  try {
    const response = await fetch('/api/support/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ subject, message, reply_email: replyEmail }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return { error: { message: data?.error || 'Falha ao enviar.', code: data?.code } }
    }

    return { error: null }
  } catch (error) {
    return { error: { message: error.message } }
  }
}
