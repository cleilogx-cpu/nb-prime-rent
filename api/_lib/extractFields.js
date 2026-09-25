/**
 * Extração de campos a partir do texto bruto devolvido pelo OCR genérico
 * (seção 7/8 do pedido: nunca inventar um dado -- se não achar com
 * segurança, o campo fica null e a tela mostra vazio pra conferência
 * manual). CNH tem rótulos impressos padronizados (NOME, DATA NASCIMENTO,
 * VALIDADE...) que servem de âncora pra achar o valor ao lado; comprovante
 * de residência usa o CEP encontrado no texto + consulta ao ViaCEP (API
 * pública, sem chave) pra montar o endereço estruturado -- muito mais
 * confiável do que tentar adivinhar logradouro/bairro/cidade só pelo
 * layout solto do OCR.
 */

function toIsoDate(brDate) {
  if (!brDate) {
    return null
  }
  const match = brDate.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) {
    return null
  }
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function findLineIndexContaining(lines, keywords) {
  return lines.findIndex((line) => keywords.some((keyword) => line.toUpperCase().includes(keyword)))
}

function findDateNear(lines, keywords) {
  const index = findLineIndexContaining(lines, keywords)
  if (index === -1) {
    return null
  }
  // a data às vezes fica na mesma linha do rótulo, às vezes numa linha
  // separada logo abaixo -- depende de como o OCR leu o layout do cartão.
  for (let i = index; i < Math.min(index + 3, lines.length); i++) {
    const match = lines[i].match(/\d{2}\/\d{2}\/\d{4}/)
    if (match) {
      return match[0]
    }
  }
  return null
}

// Rótulos que só aparecem colados perto de "NOME" no layout impresso da CNH
// (legenda numerada com vários campos na mesma linha, ex: "1 NOME 2 DOC
// IDENTIDADE...") -- se sobrar qualquer um destes na linha depois de tirar
// "NOME", é sinal de que pegamos o rótulo, não o valor.
const CNH_LABEL_WORDS = [
  'NOME', 'CPF', 'DATA', 'NASCIMENTO', 'VALIDADE', 'REGISTRO', 'CATEGORIA',
  'DOC', 'IDENTIDADE', 'EMISSOR', 'ASSINATURA', 'FILIACAO', 'FILIAÇÃO',
  'HABILITACAO', 'HABILITAÇÃO', 'NACIONALIDADE', 'LOCAL', 'OBSERVA',
  'RESTRI', 'PERMISSAO', 'PERMISSÃO', 'ACC', 'ESPELHO', 'CNH', 'RENACH',
  'ORGAO', 'ÓRGÃO',
]

/**
 * Confere se um texto "tem cara de nome de pessoa" antes de aceitar como
 * full_name -- só letras/espaços/acentos, pelo menos duas palavras, tamanho
 * razoável, e nenhuma palavra de rótulo sobrando. Documentos reais (foto do
 * cartão, PDF com a CNH como imagem) frequentemente têm rótulo e valor fora
 * de ordem ou colados na mesma linha do OCR -- aceitar "o que sobrou" sem
 * validar já produziu nome errado (ex: fragmento de "NOME E SOBRENOME"
 * dando "E SOBRENOME"). Falhar e deixar null é sempre melhor que salvar
 * lixo (princípio 1 do plano: nunca inventar).
 */
function looksLikeName(text) {
  if (!text) {
    return false
  }
  const cleaned = text.trim()
  if (cleaned.length < 5 || cleaned.length > 60) {
    return false
  }
  if (!/^[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'\s-]+$/i.test(cleaned)) {
    return false
  }
  const upper = cleaned.toUpperCase()
  if (CNH_LABEL_WORDS.some((word) => upper.includes(word))) {
    return false
  }
  const words = cleaned.split(/\s+/).filter(Boolean)
  return words.length >= 2
}

/**
 * Acha o nome do titular perto do rótulo "NOME" -- ignora "NOME SOCIAL"/
 * "NOME DO PAI"/"NOME DA MÃE" (não é o campo que queremos) e testa vários
 * candidatos (o que sobra na própria linha do rótulo, e as duas linhas
 * seguintes) até achar um que passe em looksLikeName. Sem candidato válido,
 * devolve null -- fica pra conferência manual, nunca um chute.
 */
function findNameNear(lines) {
  for (let i = 0; i < lines.length; i++) {
    const upperLine = lines[i].toUpperCase()
    if (!/\bNOME\b/.test(upperLine) || /NOME\s+(SOCIAL|DO PAI|DA M[AÃ]E)/.test(upperLine)) {
      continue
    }

    const afterLabel = lines[i].replace(/.*\bNOME\b/i, '').replace(/^[:\s-]+/, '').trim()
    const candidates = [afterLabel, lines[i + 1], lines[i + 2]]

    for (const candidate of candidates) {
      if (looksLikeName(candidate)) {
        return candidate.trim()
      }
    }
  }

  return null
}

/**
 * CNH: leitura best-effort baseada nos rótulos impressos do documento.
 * CPF e CEP têm formato fixo (bem confiáveis); nome/datas dependem da
 * nitidez da foto e da forma como o OCR leu o layout -- por isso sempre
 * ficam sujeitos a conferência humana antes de salvar (princípio 1 do
 * plano).
 */
export function extractCnhFields(rawText) {
  const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean)

  const cpfMatch = rawText.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/)
  const cnhNumberMatch = rawText.match(/\b\d{11}\b/)

  return {
    full_name: findNameNear(lines),
    cpf: cpfMatch ? cpfMatch[0] : null,
    birth_date: toIsoDate(findDateNear(lines, ['NASCIMENTO', 'DATA NASC'])),
    cnh_number: cnhNumberMatch ? cnhNumberMatch[0] : null,
    cnh_validity: toIsoDate(findDateNear(lines, ['VALIDADE'])),
  }
}

/**
 * Comprovante de residência: acha o CEP no texto (formato fixo, confiável)
 * e consulta o ViaCEP pra trazer logradouro/bairro/cidade/UF oficiais --
 * evita tentar "adivinhar" esses campos direto do layout solto do OCR.
 * Número/complemento não vêm do ViaCEP (ele só sabe o CEP, não o prédio
 * específico), então ficam null pra preenchimento manual.
 */
export async function extractComprovanteFields(rawText) {
  const cepMatch = rawText.match(/\d{5}-?\d{3}/)

  const empty = {
    address_zip: null,
    address_street: null,
    address_neighborhood: null,
    address_city: null,
    address_state: null,
  }

  if (!cepMatch) {
    return empty
  }

  const digits = cepMatch[0].replace('-', '')
  const formattedCep = `${digits.slice(0, 5)}-${digits.slice(5)}`

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    if (!response.ok) {
      throw new Error('ViaCEP indisponível')
    }

    const data = await response.json()
    if (data.erro) {
      return { ...empty, address_zip: formattedCep }
    }

    return {
      address_zip: formattedCep,
      address_street: data.logradouro || null,
      address_neighborhood: data.bairro || null,
      address_city: data.localidade || null,
      address_state: data.uf || null,
    }
  } catch (error) {
    console.warn('Falha ao consultar ViaCEP:', error.message)
    return { ...empty, address_zip: formattedCep }
  }
}
