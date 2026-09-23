-- Fase 0 do "Contrato Inteligente e Dossiê Digital" — tabelas do dossiê
-- (documentos + assinatura), multa/juros parametrizados no contrato, e o
-- trigger que impede editar um contrato já assinado (segunda camada de
-- imutabilidade, independente da trava de status que updateContract já
-- tem em .eq('status','Rascunho')).

-- PEDAÇO 1 — contract_documents (CNH, comprovante, contrato gerado,
-- contrato assinado, imagem da assinatura). tenant_id/contract_id ficam
-- nulos até existirem de verdade (documento é enviado antes do CPF ser
-- lido, que é antes do locatário/contrato existirem) -- ver draft_session_id.
create table if not exists public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  draft_session_id uuid not null,
  tenant_id uuid references public.tenants(id),
  contract_id uuid references public.contracts(id),
  doc_type text not null check (doc_type in (
    'cnh', 'comprovante_residencia', 'contrato_gerado_docx',
    'contrato_gerado_pdf', 'contrato_assinado_pdf', 'assinatura_imagem'
  )),
  storage_path text not null unique,
  mime_type text,
  original_filename text,
  file_size_bytes integer,
  ocr_status text check (ocr_status in ('pending', 'success', 'partial', 'failed', 'not_applicable')),
  ocr_fields jsonb,
  ocr_raw_response jsonb,
  superseded_by uuid references public.contract_documents(id),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists contract_documents_draft_session_idx on public.contract_documents(draft_session_id);
create index if not exists contract_documents_contract_idx on public.contract_documents(contract_id);

-- PEDAÇO 2 — contract_signatures (evidência da assinatura eletrônica).
-- Uma linha por contrato (unique) -- se o contrato precisar mudar depois
-- de assinado, isso é fora do escopo desta leva (vira um contrato novo,
-- não uma segunda assinatura).
create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id),
  signer_full_name text not null,
  signer_cpf text not null,
  signature_image_document_id uuid not null references public.contract_documents(id),
  signed_pdf_document_id uuid not null references public.contract_documents(id),
  document_hash text not null,
  operator_user_id uuid not null references auth.users(id),
  ip_address text,
  user_agent text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- PEDAÇO 3 — multa/juros gravados no contrato na criação (snapshot --
-- contratos antigos preservam o valor da época, mesmo que o padrão mude
-- depois). Cláusula 5ª hoje é texto fixo "10%... 1% ao mês"; a Fase 3
-- passa a interpolar estes dois campos em vez do texto fixo.
alter table public.contracts add column if not exists late_fee_percent numeric(5,2) not null default 10;
alter table public.contracts add column if not exists late_interest_percent_month numeric(5,2) not null default 1;

-- PEDAÇO 4 — RLS das tabelas novas, mesmo padrão já usado em tenants/
-- contracts/rentals (for authenticated using (true) -- só 2 usuários
-- confiáveis, sem checagem por dono).
alter table public.contract_documents enable row level security;
alter table public.contract_signatures enable row level security;

drop policy if exists contract_documents_select on public.contract_documents;
create policy contract_documents_select on public.contract_documents for select to authenticated using (true);
drop policy if exists contract_documents_insert on public.contract_documents;
create policy contract_documents_insert on public.contract_documents for insert to authenticated with check (true);
drop policy if exists contract_documents_update on public.contract_documents;
create policy contract_documents_update on public.contract_documents for update to authenticated using (true) with check (true);

-- contract_signatures só é escrita pela função de servidor (chave de
-- serviço, ignora RLS) -- authenticated só tem select, então nem um bug
-- no navegador consegue gravar uma assinatura direto no banco.
drop policy if exists contract_signatures_select on public.contract_signatures;
create policy contract_signatures_select on public.contract_signatures for select to authenticated using (true);

-- PEDAÇO 5 — trigger que bloqueia editar campos de negócio de um
-- contrato que já tem assinatura registrada, independente do status.
-- Permite exatamente os campos que signContract/endLocation já tocam
-- hoje (status, rental_id, signed_document_url) -- qualquer outro campo
-- de negócio some do UPDATE e o trigger recusa.
create or replace function public.prevent_edit_signed_contract()
returns trigger as $$
begin
  if exists (select 1 from public.contract_signatures s where s.contract_id = old.id) then
    if (new.tenant_id, new.vehicle_id, new.start_date, new.end_date, new.payment_amount,
        new.deposit_amount, new.periodicity, new.finance_model, new.initial_km, new.weeks,
        new.billing_day, new.late_fee_percent, new.late_interest_percent_month,
        new.observations, new.clauses, new.contract_number)
      is distinct from
       (old.tenant_id, old.vehicle_id, old.start_date, old.end_date, old.payment_amount,
        old.deposit_amount, old.periodicity, old.finance_model, old.initial_km, old.weeks,
        old.billing_day, old.late_fee_percent, old.late_interest_percent_month,
        old.observations, old.clauses, old.contract_number)
    then
      raise exception 'Contrato assinado não pode ser editado.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists contracts_block_signed_edit on public.contracts;
create trigger contracts_block_signed_edit
before update on public.contracts
for each row execute function public.prevent_edit_signed_contract();

-- PEDAÇO 6 — bucket privado de Storage pros documentos. Sem política de
-- UPDATE/DELETE de propósito: cada envio/reenvio é um objeto novo
-- (contract_document_id no caminho), nunca sobrescreve -- reforça em
-- nível de infraestrutura que o dossiê nunca é apagado nem substituído
-- por acidente/bug.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_authenticated_read on storage.objects;
create policy documents_authenticated_read
  on storage.objects for select to authenticated
  using (bucket_id = 'documents');

drop policy if exists documents_authenticated_insert on storage.objects;
create policy documents_authenticated_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents');
