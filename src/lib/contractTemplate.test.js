import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SAMPLE_CONTRACT,
  extractTokens,
  findUnknownTokens,
  itemLetter,
  numberBlocks,
  numberToWords,
  renderTemplate,
  validateTemplateContent,
} from './contractTemplate.js'

const settings = {
  company_name: 'Alfa Locações Ltda',
  resp_name: 'Fulano de Tal',
  resp_cpf: '111.111.111-11',
  resp_address: 'Rua A, 1',
  late_fee_percent: 5,
  late_interest_percent_month: 2,
}

const template = {
  header: { title: 'CONTRATO', subtitle: 'Veículo [MARCA/MODELO]', date: '[DATA DE INÍCIO]' },
  blocks: [
    { id: '1', type: 'heading', text: 'Das partes' },
    { id: '2', type: 'text', text: 'LOCADOR: [NOME DO LOCADOR], CPF [CPF DO LOCADOR].' },
    { id: '3', type: 'clause', text: 'O veículo [VEÍCULO], placa [PLACA], por [VALOR DA LOCAÇÃO], periodicidade [PERIODICIDADE].' },
    { id: '4', type: 'paragraph', text: 'Primeiro parágrafo.' },
    { id: '5', type: 'item', text: 'item a' },
    { id: '6', type: 'item', text: 'item b' },
    { id: '7', type: 'paragraph', text: 'Segundo parágrafo.' },
    { id: '8', type: 'item', text: 'reinicia em a' },
    { id: '9', type: 'clause', title: 'Do valor', text: 'Multa [MULTA POR ATRASO] e juros [JUROS DE MORA].' },
    { id: '10', type: 'text', text: '[CRONOGRAMA DE PAGAMENTOS]' },
    { id: '11', type: 'closing', text: 'Local e data: [DATA DE INÍCIO]' },
  ],
}

test('numeração automática: seção, cláusula, parágrafo e alínea reiniciam certo', () => {
  const labels = numberBlocks(template.blocks).map((block) => block.label)
  assert.deepEqual(labels, ['1.', '', 'CLÁUSULA 1ª', '§ 1º', 'a)', 'b)', '§ 2º', 'a)', 'CLÁUSULA 2ª', '', ''])
  assert.equal(itemLetter(25), 'z)')
  assert.equal(itemLetter(26), 'aa)')
})

test('reordenar blocos renumera sozinho (sem número digitado no texto)', () => {
  const swapped = [template.blocks[8], template.blocks[2]]
  assert.deepEqual(numberBlocks(swapped).map((block) => block.label), ['CLÁUSULA 1ª', 'CLÁUSULA 2ª'])
})

test('troca os campos de empresa/locador/locatário/veículo/locação pelos dados reais', () => {
  const { sections, missingConfig } = renderTemplate(template, { contract: SAMPLE_CONTRACT, settings })
  const text = sections.map((section) => section.text || (section.items || []).join(' ')).join('\n')

  assert.match(text, /LOCADOR: FULANO DE TAL, CPF 111\.111\.111-11\./)
  assert.match(text, /CLÁUSULA 1ª — O veículo Marca Modelo Exemplo, placa ABC1D23, por R\$\s?1\.500,00, periodicidade semanal\./)
  assert.match(text, /Veículo Marca Modelo Exemplo/)
  assert.match(text, /07\/01\/2030/)
  assert.deepEqual(missingConfig, [])
  assert.ok(!/\[[A-ZÀ-Ú/ ]+\]/.test(text), 'nenhum campo [..] deve sobrar na minuta')
})

test('multa e juros vêm do snapshot do próprio contrato, não da configuração atual', () => {
  const { sections } = renderTemplate(template, { contract: SAMPLE_CONTRACT, settings })
  const clause = sections.find((section) => /Multa/.test(section.text || ''))
  assert.match(clause.text, /Multa 10% e juros 1%/)

  const semSnapshot = { ...SAMPLE_CONTRACT, late_fee_percent: null, late_interest_percent_month: null }
  const fallback = renderTemplate(template, { contract: semSnapshot, settings }).sections.find((s) => /Multa/.test(s.text || ''))
  assert.match(fallback.text, /Multa 5% e juros 2%/)
})

test('cláusula com título vira linha de título + texto', () => {
  const { sections } = renderTemplate(template, { contract: SAMPLE_CONTRACT, settings })
  const index = sections.findIndex((section) => section.type === 'clausetitle')
  assert.equal(sections[index].text, 'CLÁUSULA 2ª — DO VALOR')
  assert.equal(sections[index + 1].type, 'paragraph')
})

test('cronograma vira lista com uma linha por cobrança', () => {
  const { sections } = renderTemplate(template, { contract: SAMPLE_CONTRACT, settings })
  const list = sections.find((section) => section.type === 'list')
  assert.ok(list.items.length >= 13)
  assert.match(list.items[0], /ato da assinatura/)
})

test('dados da empresa/responsável faltando bloqueiam (missingConfig); do contrato saem "não informado"', () => {
  const vazio = renderTemplate(template, { contract: SAMPLE_CONTRACT, settings: {} })
  assert.ok(vazio.missingConfig.some((item) => item.token === 'NOME DO LOCADOR'))

  const semPlaca = { ...SAMPLE_CONTRACT, vehicles: { model: 'X' } }
  const result = renderTemplate(template, { contract: semPlaca, settings })
  assert.ok(result.missingContract.some((item) => item.token === 'PLACA'))
  assert.ok(result.sections.some((section) => /placa não informado/.test(section.text || '')))
})

test('modo "tokens" mantém os [CAMPOS] visíveis (revisão do modelo)', () => {
  const { sections } = renderTemplate(template, { contract: SAMPLE_CONTRACT, settings, mode: 'tokens' })
  assert.ok(sections.some((section) => /\[VEÍCULO\]/.test(section.text || '')))
})

test('identificação das partes no final, sem imagem de assinatura', () => {
  const { sections } = renderTemplate(template, { contract: SAMPLE_CONTRACT, settings })
  const signature = sections.at(-1)
  assert.equal(signature.type, 'signature')
  assert.equal(signature.locador, 'FULANO DE TAL')
  assert.equal(signature.locadorCpf, '111.111.111-11')
  assert.equal(signature.locatario, 'MARIA EXEMPLO DA SILVA')
  assert.equal(signature.locadorRole, 'LOCADOR / REPRESENTANTE')
  assert.equal('locatarioSignatureImage' in signature, false)
})

test('validação do modelo: campo desconhecido, texto vazio e falta de cláusula', () => {
  assert.deepEqual(findUnknownTokens(template), [])
  assert.deepEqual(findUnknownTokens({ blocks: [{ type: 'text', text: 'Olá [NOME DO LOCATARIO]' }] }), ['NOME DO LOCATARIO'])
  assert.equal(validateTemplateContent(template).length, 0)

  const problems = validateTemplateContent({ header: { title: '' }, blocks: [{ type: 'text', text: '' }] })
  assert.ok(problems.length >= 3)
})

test('extractTokens e numberToWords', () => {
  assert.deepEqual(extractTokens('[A] e [b] e [A]'), ['A', 'B'])
  assert.equal(numberToWords(13), 'treze')
  assert.equal(numberToWords(21), 'vinte e um')
})
