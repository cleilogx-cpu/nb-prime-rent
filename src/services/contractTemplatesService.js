import { supabase } from '../lib/supabaseClient.js'

const TABLE = 'contract_templates'

export const TEMPLATE_STATUS = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
}

/** Todas as versões, da mais nova pra mais antiga. */
export async function listTemplateVersions() {
  const { data, error } = await supabase.from(TABLE).select('*').order('version', { ascending: false })
  return { data: data ?? [], error }
}

export async function getActiveTemplate() {
  const { data, error } = await supabase.from(TABLE).select('*').eq('status', TEMPLATE_STATUS.ACTIVE).maybeSingle()
  return { data, error }
}

export async function getTemplateById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
  return { data, error }
}

/**
 * Cria a próxima versão como Rascunho, copiando uma versão existente
 * (editar o modelo ativo = nascer uma versão nova, a anterior fica intacta)
 * ou partindo do conteúdo informado (primeiro modelo).
 */
export async function createTemplateDraft({ basedOnVersion = null, content = null } = {}) {
  const { data, error } = await supabase.rpc('create_contract_template_draft', {
    p_based_on_version: basedOnVersion,
    p_content: content,
  })
  return { data, error }
}

export async function saveTemplateDraft(id, content) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ content })
    .eq('id', id)
    .eq('status', TEMPLATE_STATUS.DRAFT)
    .select('*')
    .single()
  return { data, error }
}

export async function discardTemplateDraft(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('status', TEMPLATE_STATUS.DRAFT)
  return { error }
}

/** Valida o rascunho: vira o modelo ativo e o anterior é arquivado (atômico, no banco). */
export async function activateTemplate(id) {
  const { data, error } = await supabase.rpc('activate_contract_template', { p_id: id })
  return { data, error }
}
