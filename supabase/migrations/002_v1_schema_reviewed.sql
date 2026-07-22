-- RASCUNHO REVISADO PARA REVISÃO
-- Objetivo: evoluir o esquema sem apagar tabelas atuais nem perder dados existentes.
-- Não executar automaticamente. Este arquivo é apenas para revisão.

create extension if not exists "uuid-ossp";

-- =========================================================
-- 1) PERFIS E ENTIDADES PRINCIPAIS
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin','partner','employee')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_profiles_auth_user unique (auth_user_id)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text,
  rg text,
  birth_date date,
  cnh_number text,
  cnh_category text,
  cnh_validity date,
  phone text,
  whatsapp text,
  email text,
  address text,
  emergency_contact text,
  pix_key text,
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  contract_id uuid,
  start_date date not null,
  expected_end_date date,
  weekly_rent numeric(12,2) not null default 0,
  billing_day integer,
  security_deposit_amount numeric(12,2) not null default 0,
  periodicity text not null default 'weekly' check (periodicity in ('weekly','biweekly','monthly')),
  status text not null default 'active' check (status in ('active','pending','finished','cancelled')),
  financial_conditions text,
  observations text,
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_rentals_active_vehicle
  on public.rentals(vehicle_id)
  where status = 'active' and is_cancelled = false;

-- =========================================================
-- 2) PAGAMENTOS E MODELOS FINANCEIROS
-- =========================================================

-- Nova tabela compatível com a tabela atual public.payments, sem sobrescrevê-la.
create table if not exists public.rental_payments (
  id uuid primary key default gen_random_uuid(),
  source_payment_id uuid references public.payments(id) on delete set null,
  rental_id uuid references public.rentals(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  reference_period text,
  expected_date date,
  received_date date,
  expected_amount numeric(12,2) not null default 0,
  received_amount numeric(12,2) not null default 0,
  payment_type text not null default 'rent' check (payment_type in ('rent','deposit','adjustment','fine','other')),
  payment_method text,
  status text not null default 'pending' check (status in ('pending','received','partially_received','cancelled')),
  financial_model text not null default 'partners' check (financial_model in ('partners','savings')),
  financial_destination text,
  partner_beneficiary text check (partner_beneficiary in ('Clei','Edson')),
  fund_reference text,
  observations text,
  proof_url text,
  created_by uuid references public.profiles(id) on delete set null,
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_payment_financial_rule
    check (
      (financial_model = 'partners' and partner_beneficiary in ('Clei','Edson'))
      or
      (financial_model = 'savings' and partner_beneficiary is null)
    )
);

create index if not exists idx_rental_payments_rental_id on public.rental_payments(rental_id);
create index if not exists idx_rental_payments_status on public.rental_payments(status);
create index if not exists idx_rental_payments_financial_model on public.rental_payments(financial_model);

-- =========================================================
-- 3) CAUÇÕES E MOVIMENTAÇÕES
-- =========================================================

create table if not exists public.security_deposits (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  contracted_amount numeric(12,2) not null default 0,
  total_received numeric(12,2) not null default 0,
  total_credited numeric(12,2) not null default 0,
  total_returned numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  pending_amount numeric(12,2) not null default 0,
  status text not null default 'active' check (status in ('active','released','partial','cancelled')),
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposit_transactions (
  id uuid primary key default gen_random_uuid(),
  security_deposit_id uuid references public.security_deposits(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('receipt','complement','credit','return','adjustment','cancelled')),
  amount numeric(12,2) not null default 0,
  description text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_security_deposits_rental_id on public.security_deposits(rental_id);
create index if not exists idx_deposit_transactions_security_deposit_id on public.deposit_transactions(security_deposit_id);

-- =========================================================
-- 4) DESPESAS, OBRIGAÇÕES E FUNDO DO VEÍCULO
-- =========================================================

create table if not exists public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  rental_id uuid references public.rentals(id) on delete set null,
  category text not null,
  description text not null,
  amount numeric(12,2) not null default 0,
  expense_date date not null,
  funding_source text,
  payment_method text,
  proof_url text,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  recurring boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_obligations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  description text not null,
  category text not null,
  creditor text,
  amount numeric(12,2) not null default 0,
  due_date date,
  frequency text not null default 'monthly' check (frequency in ('monthly','quarterly','annual','once')),
  installments_total integer,
  current_installment integer,
  start_date date,
  end_date date,
  status text not null default 'pending' check (status in ('pending','paid','overdue','cancelled')),
  payment_origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_fund_transactions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  rental_id uuid references public.rentals(id) on delete set null,
  transaction_type text not null check (transaction_type in ('rent_receipt','deposit_receipt','interest_adjustment','monthly_withdrawal','expense','refund','cancelled')),
  amount numeric(12,2) not null default 0,
  description text,
  transaction_date date not null,
  purpose text,
  created_by uuid references public.profiles(id) on delete set null,
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vehicle_expenses_vehicle_id on public.vehicle_expenses(vehicle_id);
create index if not exists idx_vehicle_obligations_vehicle_id on public.vehicle_obligations(vehicle_id);
create index if not exists idx_vehicle_fund_transactions_vehicle_id on public.vehicle_fund_transactions(vehicle_id);

-- =========================================================
-- 5) CONTRATOS, DOCUMENTOS E ALERTAS
-- =========================================================

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete restrict,
  contract_template text,
  generated_pdf_url text,
  version_number integer not null default 1,
  status text not null default 'draft' check (status in ('draft','active','renewed','expired','cancelled')),
  start_date date,
  end_date date,
  renewal_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  document_type text not null,
  storage_bucket text not null default 'private-documents',
  storage_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  rental_id uuid references public.rentals(id) on delete set null,
  alert_type text not null,
  title text not null,
  message text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'active' check (status in ('active','resolved','dismissed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alerts_due_date on public.alerts(due_date);

-- =========================================================
-- 6) AUDITORIA COMPATÍVEL COM A TABELA EXISTENTE
-- =========================================================

-- A tabela atual public.audit_logs deve ser preservada.
-- Este bloco adiciona colunas compatíveis sem sobrescrever o esquema existente.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'user_id'
  ) then
    alter table public.audit_logs add column user_id uuid;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'previous_values'
  ) then
    alter table public.audit_logs add column previous_values jsonb;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'new_values'
  ) then
    alter table public.audit_logs add column new_values jsonb;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'reason'
  ) then
    alter table public.audit_logs add column reason text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'is_deleted'
  ) then
    alter table public.audit_logs add column is_deleted boolean not null default false;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'deleted_at'
  ) then
    alter table public.audit_logs add column deleted_at timestamptz;
  end if;
end $$;

create index if not exists idx_audit_logs_entity_id on public.audit_logs(entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- =========================================================
-- 7) TRIGGERS DE UPDATED_AT
-- =========================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_tenants
before update on public.tenants
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_rentals
before update on public.rentals
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_rental_payments
before update on public.rental_payments
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_security_deposits
before update on public.security_deposits
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_deposit_transactions
before update on public.deposit_transactions
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_vehicle_expenses
before update on public.vehicle_expenses
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_vehicle_obligations
before update on public.vehicle_obligations
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_vehicle_fund_transactions
before update on public.vehicle_fund_transactions
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_contracts
before update on public.contracts
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_documents
before update on public.documents
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_alerts
before update on public.alerts
for each row execute function public.set_updated_at();

-- =========================================================
-- 8) RLS INICIAL (APENAS AUTHENTICATED)
-- =========================================================

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.rentals enable row level security;
alter table public.rental_payments enable row level security;
alter table public.security_deposits enable row level security;
alter table public.deposit_transactions enable row level security;
alter table public.vehicle_expenses enable row level security;
alter table public.vehicle_obligations enable row level security;
alter table public.vehicle_fund_transactions enable row level security;
alter table public.contracts enable row level security;
alter table public.documents enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas genéricas para authenticated. Ajustes por perfil devem ser feitos em migrações futuras.
create policy if not exists profiles_select on public.profiles for select to authenticated using (true);
create policy if not exists profiles_insert on public.profiles for insert to authenticated with check (true);
create policy if not exists profiles_update on public.profiles for update to authenticated using (true) with check (true);

create policy if not exists tenants_select on public.tenants for select to authenticated using (true);
create policy if not exists tenants_insert on public.tenants for insert to authenticated with check (true);
create policy if not exists tenants_update on public.tenants for update to authenticated using (true) with check (true);

create policy if not exists rentals_select on public.rentals for select to authenticated using (true);
create policy if not exists rentals_insert on public.rentals for insert to authenticated with check (true);
create policy if not exists rentals_update on public.rentals for update to authenticated using (true) with check (true);

create policy if not exists rental_payments_select on public.rental_payments for select to authenticated using (true);
create policy if not exists rental_payments_insert on public.rental_payments for insert to authenticated with check (true);
create policy if not exists rental_payments_update on public.rental_payments for update to authenticated using (true) with check (true);

create policy if not exists security_deposits_select on public.security_deposits for select to authenticated using (true);
create policy if not exists security_deposits_insert on public.security_deposits for insert to authenticated with check (true);
create policy if not exists security_deposits_update on public.security_deposits for update to authenticated using (true) with check (true);

create policy if not exists deposit_transactions_select on public.deposit_transactions for select to authenticated using (true);
create policy if not exists deposit_transactions_insert on public.deposit_transactions for insert to authenticated with check (true);
create policy if not exists deposit_transactions_update on public.deposit_transactions for update to authenticated using (true) with check (true);

create policy if not exists vehicle_expenses_select on public.vehicle_expenses for select to authenticated using (true);
create policy if not exists vehicle_expenses_insert on public.vehicle_expenses for insert to authenticated with check (true);
create policy if not exists vehicle_expenses_update on public.vehicle_expenses for update to authenticated using (true) with check (true);

create policy if not exists vehicle_obligations_select on public.vehicle_obligations for select to authenticated using (true);
create policy if not exists vehicle_obligations_insert on public.vehicle_obligations for insert to authenticated with check (true);
create policy if not exists vehicle_obligations_update on public.vehicle_obligations for update to authenticated using (true) with check (true);

create policy if not exists vehicle_fund_transactions_select on public.vehicle_fund_transactions for select to authenticated using (true);
create policy if not exists vehicle_fund_transactions_insert on public.vehicle_fund_transactions for insert to authenticated with check (true);
create policy if not exists vehicle_fund_transactions_update on public.vehicle_fund_transactions for update to authenticated using (true) with check (true);

create policy if not exists contracts_select on public.contracts for select to authenticated using (true);
create policy if not exists contracts_insert on public.contracts for insert to authenticated with check (true);
create policy if not exists contracts_update on public.contracts for update to authenticated using (true) with check (true);

create policy if not exists documents_select on public.documents for select to authenticated using (true);
create policy if not exists documents_insert on public.documents for insert to authenticated with check (true);
create policy if not exists documents_update on public.documents for update to authenticated using (true) with check (true);

create policy if not exists alerts_select on public.alerts for select to authenticated using (true);
create policy if not exists alerts_insert on public.alerts for insert to authenticated with check (true);
create policy if not exists alerts_update on public.alerts for update to authenticated using (true) with check (true);

create policy if not exists audit_logs_select on public.audit_logs for select to authenticated using (true);
create policy if not exists audit_logs_insert on public.audit_logs for insert to authenticated with check (true);
create policy if not exists audit_logs_update on public.audit_logs for update to authenticated using (true) with check (true);
