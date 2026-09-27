/**
 * Pede um token novo do Turnstile -- ele é de uso único, então depois de
 * uma tentativa de login que falhou (senha errada ou captcha inválido/
 * expirado) o token antigo não serve mais pra próxima tentativa. Função à
 * parte (fora de TurnstileWidget.jsx) só pra não misturar componente com
 * utilitário no mesmo arquivo, que quebra o Fast Refresh do Vite.
 */
export function resetTurnstile() {
  if (window.turnstile) {
    window.turnstile.reset()
  }
}
