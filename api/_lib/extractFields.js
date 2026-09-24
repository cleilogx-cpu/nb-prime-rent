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

function findValueNear(lines, keywords) {
  const index = findLineIndexContaining(lines, keywords)
  if (index === -1) {
    return null
  }

  const label = lines[index]
  const regex = new RegExp(keywords.join('|'), 'i')
  const afterLabel = label.replace(regex, '').replace(/^[:\s-]+/, '').trim()
  if (afterLabel) {
    return afterLabel
  }

  return lines[index + 1]?.trim() || null
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
    full_name: findValueNear(lines, ['NOME']),
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
