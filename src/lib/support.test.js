import test from 'node:test'
import assert from 'node:assert/strict'
import { getHelpUrl, isValidEmail, validateContactForm } from './support.js'

const valid = { subject: 'Dúvida', message: 'Como faço para encerrar?', replyEmail: 'a@b.com' }

test('formulário válido não tem erros', () => {
  assert.deepEqual(validateContactForm(valid), {})
})

test('assunto obrigatório e restrito às 3 opções', () => {
  assert.ok(validateContactForm({ ...valid, subject: '' }).subject)
  assert.ok(validateContactForm({ ...valid, subject: 'Outro' }).subject)
  for (const subject of ['Dúvida', 'Sugestão', 'Relatar um problema']) {
    assert.equal(validateContactForm({ ...valid, subject }).subject, undefined)
  }
})

test('mensagem vazia, só espaços ou curta demais é recusada', () => {
  assert.ok(validateContactForm({ ...valid, message: '' }).message)
  assert.ok(validateContactForm({ ...valid, message: '      ' }).message)
  assert.ok(validateContactForm({ ...valid, message: 'oi' }).message)
  assert.ok(validateContactForm({ ...valid, message: 'x'.repeat(2001) }).message)
})

test('e-mail de resposta precisa ser válido', () => {
  assert.equal(isValidEmail('a@b.com'), true)
  assert.equal(isValidEmail('sem-arroba'), false)
  assert.equal(isValidEmail('a@b'), false)
  assert.ok(validateContactForm({ ...valid, replyEmail: 'x' }).replyEmail)
})

test('URL de dúvidas frequentes: só http(s) válida; senão fica oculta', () => {
  assert.equal(getHelpUrl(''), '')
  assert.equal(getHelpUrl(undefined), '')
  assert.equal(getHelpUrl('#'), '')
  assert.equal(getHelpUrl('texto solto'), '')
  assert.equal(getHelpUrl('javascript:alert(1)'), '')
  assert.equal(getHelpUrl('https://apps.exemplo.com/ajuda/nb-prime-rent'), 'https://apps.exemplo.com/ajuda/nb-prime-rent')
})
