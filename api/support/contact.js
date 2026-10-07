import { createClient } from '@supabase/supabase-js'

const SUBJECTS = ['Dúvida', 'Sugestão', 'Relatar um problema']
const APP_NAME = 'NB Prime Rent'
const DEFAULT_TO = 'cleilogx@gmail.com'
// Remetente "onboarding@resend.dev" é o remetente de teste do Resend: só
// entrega pro e-mail dono da conta Resend (aqui, o mesmo destino das
// mensagens). Se um domínio próprio for verificado no Resend, basta
// configurar CONTACT_FROM_EMAIL na Vercel -- nenhum código muda.
const DEFAULT_FROM = `${APP_NAME} <onboarding@resend.dev>`
const MESSAGE_MIN = 10
const MESSAGE_MAX = 2000
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Cabeçalhos de e-mail não podem ter quebra de linha (injeção de cabeçalho).
function singleLine(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim()
}

function formatSentAt(date) {
  const text = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date)
  return `${text} (horário de Brasília, UTC−03:00)`
}

function resolveUserName(user) {
  const metadata = user.user_metadata || {}
  const fromMetadata = metadata.full_name || metadata.name
  if (fromMetadata) {
    return singleLine(fromMetadata)
  }
  return singleLine((user.email || 'Usuário').split('@')[0])
}

/**
 * Fale conosco (Ajuda e contato): recebe a mensagem do formulário e envia
 * por e-mail (Resend) pra caixa do dono do sistema. A chave do Resend fica
 * só aqui no servidor. O nome do usuário vem da sessão autenticada, nunca
 * do corpo da requisição. Limite de 5 mensagens por hora por usuário,
 * contado na tabela support_contact_log (só a service_role acessa).
 *
 * Códigos de erro devolvidos: not_configured, unauthorized, invalid,
 * rate_limited, send_failed -- o navegador mostra a mesma mensagem
 * genérica pro usuário em todos os casos de falha.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.', code: 'invalid' })
    return
  }

  const resendKey = process.env.RESEND_API_KEY

  if (!resendKey || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) {
    console.error('Fale conosco: envio de e-mail não configurado (RESEND_API_KEY ausente).')
    res.status(503).json({ error: 'Envio de e-mail não configurado no servidor.', code: 'not_configured' })
    return
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')

  if (!token) {
    res.status(401).json({ error: 'Não autenticado.', code: 'unauthorized' })
    return
  }

  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    res.status(401).json({ error: 'Sessão inválida.', code: 'unauthorized' })
    return
  }

  const user = userData.user
  const body = req.body || {}
  const subject = typeof body.subject === 'string' ? body.subject : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const replyEmail = typeof body.reply_email === 'string' ? body.reply_email.trim() : ''

  if (
    !SUBJECTS.includes(subject) ||
    message.length < MESSAGE_MIN ||
    message.length > MESSAGE_MAX ||
    !EMAIL_PATTERN.test(replyEmail) ||
    replyEmail.length > 254
  ) {
    res.status(400).json({ error: 'Dados inválidos.', code: 'invalid' })
    return
  }

  // Proteção contra abuso: reserva uma vaga no log antes de enviar (e
  // devolve se o envio falhar, pra uma falha não "gastar" o limite).
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count, error: countError } = await supabaseAdmin
    .from('support_contact_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since)

  if (countError) {
    console.error('Fale conosco: falha ao consultar o limite de envios:', countError.message)
    res.status(500).json({ error: 'Falha ao validar o envio.', code: 'send_failed' })
    return
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: 'Muitas mensagens em pouco tempo.', code: 'rate_limited' })
    return
  }

  const { data: reserved, error: reserveError } = await supabaseAdmin
    .from('support_contact_log')
    .insert({ user_id: user.id })
    .select('id')
    .single()

  if (reserveError) {
    console.error('Fale conosco: falha ao registrar o envio:', reserveError.message)
    res.status(500).json({ error: 'Falha ao validar o envio.', code: 'send_failed' })
    return
  }

  const userName = resolveUserName(user)
  const sentAt = formatSentAt(new Date())
  const emailSubject = `${APP_NAME} — ${subject} — ${userName}`

  const text = [
    `Aplicativo: ${APP_NAME}`,
    `Assunto: ${subject}`,
    `Nome: ${userName}`,
    `E-mail para resposta: ${replyEmail}`,
    `Conta de login: ${user.email || '—'}`,
    `Enviado em: ${sentAt}`,
    '',
    'Mensagem:',
    message,
  ].join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
      <p><strong>Aplicativo:</strong> ${escapeHtml(APP_NAME)}</p>
      <p><strong>Assunto:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Nome:</strong> ${escapeHtml(userName)}</p>
      <p><strong>E-mail para resposta:</strong> ${escapeHtml(replyEmail)}</p>
      <p><strong>Conta de login:</strong> ${escapeHtml(user.email || '—')}</p>
      <p><strong>Enviado em:</strong> ${escapeHtml(sentAt)}</p>
      <p><strong>Mensagem:</strong></p>
      <p style="white-space:pre-wrap;border-left:3px solid #D4AF37;padding-left:12px">${escapeHtml(message)}</p>
    </div>`

  let sent = false

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
        to: [process.env.CONTACT_TO_EMAIL || DEFAULT_TO],
        reply_to: replyEmail,
        subject: emailSubject,
        text,
        html,
      }),
    })

    if (response.ok) {
      sent = true
    } else {
      const detail = await response.text()
      console.error('Fale conosco: Resend recusou o envio:', response.status, detail.slice(0, 300))
    }
  } catch (error) {
    console.error('Fale conosco: falha de rede ao chamar o Resend:', error.message)
  }

  if (!sent) {
    await supabaseAdmin.from('support_contact_log').delete().eq('id', reserved.id)
    res.status(502).json({ error: 'Não foi possível enviar a mensagem.', code: 'send_failed' })
    return
  }

  res.status(200).json({ ok: true })
}
