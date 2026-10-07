import { renderTemplate } from '../lib/contractTemplate.js'
import { getCompanySettings } from './settingsService.js'
import { getActiveTemplate, getTemplateById, listTemplateVersions } from './contractTemplatesService.js'

/**
 * Monta o snapshot da minuta: o texto JÁ com os dados reais trocados, mais o
 * que for preciso pra gerar PDF/Word depois. É gravado no próprio contrato
 * (contracts.contract_snapshot) -- por isso mexer no modelo ou nas
 * Configurações depois nunca altera um contrato que já foi gerado.
 */
export function buildSnapshot({ template, settings, contract }) {
  const rendered = renderTemplate(template.content, { contract, settings })

  return {
    snapshot: {
      sections: rendered.sections,
      template_version: template.version,
      header_text: `${settings.company_name || 'Contrato'} — Contrato de Locação`,
      rendered_at: new Date().toISOString(),
      missing_contract: rendered.missingContract.map((item) => item.label),
    },
    missingConfig: rendered.missingConfig,
    missingContract: rendered.missingContract,
  }
}

/** Minuta nova a partir do modelo ATIVO (nunca de rascunho). */
export async function renderMinuta(contract) {
  const [{ data: template, error: templateError }, { data: settings }] = await Promise.all([
    getActiveTemplate(),
    getCompanySettings(),
  ])

  if (templateError) {
    return { error: templateError }
  }
  if (!template) {
    return {
      error: { message: 'Não há modelo de contrato ativo. Peça ao administrador para validar um modelo em Configurações → Modelo de Contrato.' },
    }
  }

  return { template, settings, ...buildSnapshot({ template, settings, contract }), error: null }
}

/**
 * Snapshot de um contrato pra baixar/visualizar: usa o gravado no contrato;
 * contratos antigos (de antes do construtor, sem snapshot) são remontados
 * sem gravar nada, com o primeiro modelo (o texto original da empresa).
 */
export async function getSnapshotForContract(contract) {
  if (contract.contract_snapshot?.sections?.length) {
    return { snapshot: contract.contract_snapshot, error: null }
  }

  const [{ data: settings }, templateResult] = await Promise.all([
    getCompanySettings(),
    contract.template_id
      ? getTemplateById(contract.template_id)
      : listTemplateVersions().then(({ data, error }) => ({ data: data?.at(-1) ?? null, error })),
  ])

  if (!templateResult.data) {
    return { snapshot: null, error: templateResult.error || { message: 'Modelo de contrato não encontrado.' } }
  }

  const { snapshot } = buildSnapshot({ template: templateResult.data, settings, contract })
  return { snapshot, error: null }
}
