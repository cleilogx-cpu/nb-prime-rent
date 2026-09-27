import { useEffect, useRef } from 'react'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
let scriptPromise = null

/**
 * Carrega o script do Cloudflare Turnstile uma única vez (mesmo que o
 * componente monte/desmonte várias vezes -- ex: usuário erra a senha e o
 * widget é resetado) -- evita `<script>` duplicado na página.
 */
function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve()
  }

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Falha ao carregar o Turnstile.'))
      document.head.appendChild(script)
    })
  }

  return scriptPromise
}

/**
 * Verificação "Confirme que você é humano" (Cloudflare Turnstile) da tela
 * de login -- seção 1/3 do pedido de segurança. A validação de verdade do
 * token acontece no servidor do próprio Supabase Auth (GoTrue), que já
 * suporta Turnstile nativamente quando "Enable Captcha protection" está
 * ligado no painel (Authentication > Attack Protection) com a secret key
 * do Cloudflare -- por isso não existe nenhum endpoint novo neste projeto
 * pra verificar o token, e a secret key nunca passa perto deste código
 * (só a site key, pública por design, é usada aqui). Sem `siteKey`
 * configurada (VITE_TURNSTILE_SITE_KEY vazia), o componente não renderiza
 * nada -- login continua funcionando exatamente como antes, sem travar
 * ninguém enquanto o Cloudflare ainda não foi configurado.
 */
export default function TurnstileWidget({ siteKey, onToken, onExpire, onError, theme = 'dark' }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)

  useEffect(() => {
    if (!siteKey) {
      return
    }

    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) {
          return
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => onToken(token),
          'expired-callback': () => onExpire?.(),
          'error-callback': () => onError?.(),
        })
      })
      .catch(() => onError?.())

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  if (!siteKey) {
    return null
  }

  return <div ref={containerRef} />
}
