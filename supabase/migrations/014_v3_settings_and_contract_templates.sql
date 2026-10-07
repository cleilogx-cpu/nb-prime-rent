-- Configurações + Construtor de Contrato (modelo versionado).
--
-- 1) is_app_admin(): quem é administrador é definido por
--    auth.users.raw_app_meta_data->>'role' = 'admin' (app_metadata só pode
--    ser alterado por quem tem acesso ao painel/serviço do Supabase -- o
--    próprio usuário não consegue se promover, ao contrário de user_metadata).
-- 2) company_settings: dados da empresa, responsável pelo contrato, regras
--    contratuais e preferências (uma única linha por instalação).
-- 3) contract_templates: modelo de contrato versionado (Rascunho -> Ativo ->
--    Arquivado). Modelo ativo/arquivado nunca é editado: mudar = nova versão.
-- 4) contracts: guarda a minuta (snapshot) e a versão do modelo usada, de
--    modo que alterar o modelo ou as configurações NUNCA muda contrato antigo.
-- 5) trigger de imutabilidade passa a proteger também contratos Ativos/
--    Encerrados assinados fora do sistema (sem registro em contract_signatures).

create or replace function public.is_app_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  company_name text,
  company_trade_name text,
  company_document text,
  company_phone text,
  company_email text,
  company_address text,
  resp_name text,
  resp_cpf text,
  resp_rg text,
  resp_phone text,
  resp_email text,
  resp_role text,
  resp_address text,
  late_fee_percent numeric(5,2) not null default 10,
  late_interest_percent_month numeric(5,2) not null default 1,
  min_cnh_validity_days integer not null default 30 check (min_cnh_validity_days >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.company_settings enable row level security;

drop policy if exists company_settings_select on public.company_settings;
create policy company_settings_select on public.company_settings for select to authenticated using (true);
drop policy if exists company_settings_insert on public.company_settings;
create policy company_settings_insert on public.company_settings for insert to authenticated with check (public.is_app_admin());
drop policy if exists company_settings_update on public.company_settings;
create policy company_settings_update on public.company_settings for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  status text not null default 'Rascunho' check (status in ('Rascunho', 'Ativo', 'Arquivado')),
  content jsonb not null,
  based_on_version integer,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  validated_by uuid references auth.users(id),
  validated_at timestamptz
);

create unique index if not exists contract_templates_one_active on public.contract_templates ((true)) where status = 'Ativo';
create unique index if not exists contract_templates_one_draft on public.contract_templates ((true)) where status = 'Rascunho';

alter table public.contract_templates enable row level security;

drop policy if exists contract_templates_select on public.contract_templates;
create policy contract_templates_select on public.contract_templates for select to authenticated using (true);
drop policy if exists contract_templates_insert on public.contract_templates;
create policy contract_templates_insert on public.contract_templates for insert to authenticated with check (public.is_app_admin());
drop policy if exists contract_templates_update on public.contract_templates;
create policy contract_templates_update on public.contract_templates for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists contract_templates_delete on public.contract_templates;
create policy contract_templates_delete on public.contract_templates for delete to authenticated using (public.is_app_admin() and status = 'Rascunho');

create or replace function public.protect_contract_template()
returns trigger as $$
begin
  if old.status <> 'Rascunho' and new.content is distinct from old.content then
    raise exception 'Modelo ativo ou arquivado nao pode ser editado. Crie uma nova versao.';
  end if;
  if old.status = 'Arquivado' and new.status is distinct from old.status then
    raise exception 'Modelo arquivado nao pode mudar de status.';
  end if;
  if old.status = 'Ativo' and new.status not in ('Ativo', 'Arquivado') then
    raise exception 'Modelo ativo so pode ser arquivado.';
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contract_templates_protect on public.contract_templates;
create trigger contract_templates_protect
before update on public.contract_templates
for each row execute function public.protect_contract_template();

-- Cria a próxima versão como Rascunho (copiando o conteúdo de uma versão
-- existente, ou o conteúdo informado quando é o primeiro modelo).
create or replace function public.create_contract_template_draft(p_based_on_version integer default null, p_content jsonb default null)
returns public.contract_templates
language plpgsql
as $$
declare
  base public.contract_templates;
  created public.contract_templates;
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administrador pode criar modelo de contrato.';
  end if;
  if exists (select 1 from public.contract_templates where status = 'Rascunho') then
    raise exception 'Ja existe um rascunho de modelo em andamento.';
  end if;
  if p_based_on_version is not null then
    select * into base from public.contract_templates where version = p_based_on_version;
  end if;
  insert into public.contract_templates (version, status, content, based_on_version, created_by)
  values (
    coalesce((select max(version) from public.contract_templates), 0) + 1,
    'Rascunho',
    coalesce(base.content, p_content, '{"header":{},"blocks":[]}'::jsonb),
    base.version,
    auth.uid()
  )
  returning * into created;
  return created;
end;
$$;

-- Valida o rascunho: arquiva o modelo ativo atual e ativa este, de uma vez só.
create or replace function public.activate_contract_template(p_id uuid)
returns public.contract_templates
language plpgsql
as $$
declare
  target public.contract_templates;
begin
  if not public.is_app_admin() then
    raise exception 'Apenas administrador pode validar o modelo de contrato.';
  end if;
  select * into target from public.contract_templates where id = p_id for update;
  if not found or target.status <> 'Rascunho' then
    raise exception 'So e possivel validar um modelo em rascunho.';
  end if;
  update public.contract_templates set status = 'Arquivado' where status = 'Ativo';
  update public.contract_templates
  set status = 'Ativo', validated_at = now(), validated_by = auth.uid()
  where id = p_id
  returning * into target;
  return target;
end;
$$;

alter table public.contracts add column if not exists document_status text not null default 'Rascunho'
  check (document_status in ('Rascunho', 'Minuta gerada', 'Minuta validada', 'Contrato gerado', 'Aguardando assinatura', 'Contrato assinado'));
alter table public.contracts add column if not exists template_id uuid references public.contract_templates(id);
alter table public.contracts add column if not exists template_version integer;
alter table public.contracts add column if not exists contract_snapshot jsonb;
alter table public.contracts add column if not exists minuta_validated_at timestamptz;
alter table public.contracts add column if not exists minuta_validated_by uuid references auth.users(id);
alter table public.contracts add column if not exists signed_attached_at timestamptz;

update public.contracts c
set document_status = 'Contrato assinado'
where c.status in ('Ativo', 'Encerrado')
   or exists (select 1 from public.contract_signatures s where s.contract_id = c.id);

create or replace function public.prevent_edit_signed_contract()
returns trigger as $$
begin
  if exists (select 1 from public.contract_signatures s where s.contract_id = old.id)
     or old.status in ('Ativo', 'Encerrado') then
    if (new.tenant_id, new.vehicle_id, new.start_date, new.end_date, new.payment_amount,
        new.deposit_amount, new.periodicity, new.finance_model, new.initial_km, new.weeks,
        new.billing_day, new.late_fee_percent, new.late_interest_percent_month,
        new.observations, new.clauses, new.contract_number,
        new.template_id, new.template_version, new.contract_snapshot)
      is distinct from
       (old.tenant_id, old.vehicle_id, old.start_date, old.end_date, old.payment_amount,
        old.deposit_amount, old.periodicity, old.finance_model, old.initial_km, old.weeks,
        old.billing_day, old.late_fee_percent, old.late_interest_percent_month,
        old.observations, old.clauses, old.contract_number,
        old.template_id, old.template_version, old.contract_snapshot)
    then
      raise exception 'Contrato assinado nao pode ser editado.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;
