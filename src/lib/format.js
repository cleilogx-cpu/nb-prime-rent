/**
 * Formatação compartilhada de moeda e data. Antes desta consolidação, existiam
 * 6 cópias quase idênticas espalhadas pelo código (locationLogic.js,
 * PaymentCard.jsx, PaymentDetailsDrawer.jsx, ContractCard.jsx,
 * ContractDetailsDrawer.jsx, contractDocumentContent.js), algumas com o bug de
 * fuso horário (`new Date(value)` sem forçar meia-noite local) já corrigido
 * numa sessão anterior. Esta é a única versão a partir de agora.
 */

export function formatCurrency(value) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return 'R$ 0,00'
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numericValue)
}

/**
 * Monta o endereço completo do locatário a partir dos campos estruturados
 * (logradouro/número/bairro/CEP/complemento/cidade/UF). Locatários antigos
 * que só têm o campo `address` livre (de antes dessa separação) continuam
 * caindo no fallback — nunca tentamos "adivinhar" a separação de um texto
 * livre já salvo.
 */
export function formatTenantAddress(tenant) {
  if (!tenant) {
    return 'Não informado'
  }

  const hasStructuredAddress = Boolean(
    tenant.address_street || tenant.address_city || tenant.address_state,
  )

  if (!hasStructuredAddress) {
    return tenant.address || 'Não informado'
  }

  const line1 = [tenant.address_street, tenant.address_number].filter(Boolean).join(', ')
  const line2 = [tenant.address_neighborhood, tenant.address_complement].filter(Boolean).join(' - ')
  const line3 = [tenant.address_city, tenant.address_state].filter(Boolean).join('/')
  const zip = tenant.address_zip ? `CEP ${tenant.address_zip}` : ''

  return [line1, line2, line3, zip].filter(Boolean).join(', ') || 'Não informado'
}

/**
 * Máscara progressiva de CPF (000.000.000-00) -- usada no `onChange` do
 * campo de CPF do contrato, pra formatar enquanto o usuário digita. Aceita
 * texto já parcialmente formatado (redigita em cima do que já tinha) porque
 * primeiro tira tudo que não é dígito e reconstrói do zero. Limita a 11
 * dígitos -- dígitos extras são descartados, não empurram o CPF pra frente.
 *
 * Decisão: continua armazenando o CPF JÁ formatado (com pontuação) no banco,
 * exatamente como sempre foi feito -- não passamos a guardar só dígitos,
 * porque os locatários já cadastrados têm CPF com pontuação, e mudar o
 * formato de armazenamento quebraria a busca exata por CPF em
 * `findOrCreateTenant` pros registros antigos. Isso é só máscara de digitação
 * -- o dado final gravado é o mesmo formato de sempre.
 */
export function formatCPF(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 3) {
    return digits
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatDate(value) {
  if (!value) {
    return 'Não informado'
  }

  const parsedDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('pt-BR')
}
