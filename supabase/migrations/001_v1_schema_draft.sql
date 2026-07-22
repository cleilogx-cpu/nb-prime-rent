-- RASCUNHO DE MIGRAÇÃO PARA REVISÃO
-- Este arquivo não deve ser executado automaticamente.
-- Objetivo: definir a estrutura inicial da versão 1.0 do NB Prime Rent sem apagar dados atuais.

-- Observação: esta migração preserva as tabelas existentes e cria novas estruturas compatíveis.
-- Em produção, a execução deve ser revisada com cuidado, especialmente em relação a RLS e permissões.

create extension if not exists "uuid-ossp";

-- Tabela de perfis de usuário
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role text not null check (role in ('admin','partner','employee')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de locatários
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
  status text not null default 'active',
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de locações
create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid,
  tenant_id uuid references public.tenants(id) on delete restrict,
  contract_id uuid,
  start_date date,
  expected_end_date date,
  weekly_rent numeric(12,2) not null default 0,
  billing_day integer,
  security_deposit_amount numeric(12,2) not null default 0,
  periodicity text not null default 'weekly',
  status text not null default 'active',
  financial_conditions text,
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de pagamentos revisada
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals(id) on delete restrict,
  vehicle_id uuid,
  tenant_id uuid references public.tenants(id) on delete restrict,
  reference_period text,
  expected_date date,
  received_date date,
  expected_amount numeric(12,2) not null default 0,
  received_amount numeric(12,2) not null default 0,
  payment_type text,
  payment_method text,
  status text not null default 'pending',
  financial_destination text,
  beneficiary_partner text,
  vehicle_fund_id uuid,
  observations text,
  proof_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de cauções
create table if not exists public.security_deposits (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals(id) on delete restrict,
  vehicle_id uuid,
  contracted_amount numeric(12,2) not null default 0,
  total_received numeric(12,2) not null default 0,
  total_credited numeric(12,2) not null default 0,
  total_returned numeric(12,2) not null default 0,
  balance numeric(12,2) not null default 0,
  pending_amount numeric(12,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de movimentações de caução
create table if not exists public.deposit_transactions (
  id uuid primary key default gen_random_uuid(),
  security_deposit_id uuid references public.security_deposits(id) on delete cascade,
  transaction_type text not null,
  amount numeric(12,2) not null default 0,
  description text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela revisada de despesas
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid,
  rental_id uuid references public.rentals(id) on delete set null,
  category text not null,
  description text not null,
  amount numeric(12,2) not null default 0,
  expense_date date not null,
  funding_source text,
  payment_method text,
  proof_url text,
  status text not null default 'pending',
  recurring boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de obrigações do veículo
create table if not exists public.vehicle_obligations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid,
  description text not null,
  category text not null,
  creditor text,
  amount numeric(12,2) not null default 0,
  due_date date,
  frequency text not null default 'monthly',
  installments_total integer,
  current_installment integer,
  start_date date,
  end_date date,
  status text not null default 'pending',
  payment_origin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de movimentações do fundo do veículo
create table if not exists public.vehicle_fund_transactions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid,
  rental_id uuid references public.rentals(id) on delete set null,
  transaction_type text not null,
  amount numeric(12,2) not null default 0,
  description text,
  transaction_date date not null,
  purpose text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de contratos
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals(id) on delete restrict,
  tenant_id uuid references public.tenants(id) on delete restrict,
  vehicle_id uuid,
  contract_template text,
  generated_pdf_url text,
  version_number integer not null default 1,
  status text not null default 'draft',
  start_date date,
  end_date date,
  renewal_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de documentos
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  document_type text not null,
  storage_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de alertas
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid,
  rental_id uuid references public.rentals(id) on delete set null,
  alert_type text not null,
  title text not null,
  message text,
  due_date date,
  priority text not null default 'medium',
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela de auditoria
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  previous_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now(),
  reason text
);

-- Índices básicos
create index if not exists idx_rentals_vehicle_id on public.rentals(vehicle_id);
create index if not exists idx_rentals_tenant_id on public.rentals(tenant_id);
create index if not exists idx_payments_rental_id on public.payments(rental_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_security_deposits_rental_id on public.security_deposits(rental_id);
create index if not exists idx_expenses_vehicle_id on public.expenses(vehicle_id);
create index if not exists idx_vehicle_obligations_vehicle_id on public.vehicle_obligations(vehicle_id);
create index if not exists idx_vehicle_fund_transactions_vehicle_id on public.vehicle_fund_transactions(vehicle_id);
create index if not exists idx_alerts_due_date on public.alerts(due_date);
create index if not exists idx_audit_logs_entity_id on public.audit_logs(entity_id);

-- Triggers para updated_at
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

create or replace trigger set_updated_at_payments
before update on public.payments
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_security_deposits
before update on public.security_deposits
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_deposit_transactions
before update on public.deposit_transactions
for each row execute function public.set_updated_at();

create or replace trigger set_updated_at_expenses
before update on public.expenses
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

-- Políticas de segurança iniciais (rascunho)
-- A implementação final deve ser revisada para respeitar perfis e regras específicas.
-- O objetivo aqui é bloquear acesso público e permitir acesso somente a authenticated.

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.rentals enable row level security;
alter table public.payments enable row level security;
alter table public.security_deposits enable row level security;
alter table public.deposit_transactions enable row level security;
alter table public.expenses enable row level security;
alter table public.vehicle_obligations enable row level security;
alter table public.vehicle_fund_transactions enable row level security;
alter table public.contracts enable row level security;
alter table public.documents enable row level security;
alter table public.alerts enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas placeholder: restritas a authenticated.
-- Necessita revisão posterior para perfis e regras específicas.
create policy if not exists profiles_select on public.profiles
for select to authenticated using (true);

create policy if not exists profiles_insert on public.profiles
for insert to authenticated with check (true);

create policy if not exists profiles_update on public.profiles
for update to authenticated using (true) with check (true);

create policy if not exists tenants_select on public.tenants
for select to authenticated using (true);

create policy if not exists tenants_insert on public.tenants
for insert to authenticated with check (true);

create policy if not exists tenants_update on public.tenants
for update to authenticated using (true) with check (true);

create policy if not exists rentals_select on public.rentals
for select to authenticated using (true);

create policy if not exists rentals_insert on public.rentals
for insert to authenticated with check (true);

create policy if not exists rentals_update on public.rentals
for update to authenticated using (true) with check (true);

create policy if not exists payments_select on public.payments
for select to authenticated using (true);

create policy if not exists payments_insert on public.payments
for insert to authenticated with check (true);

create policy if not exists payments_update on public.payments
for update to authenticated using (true) with check (true);

create policy if not exists security_deposits_select on public.security_deposits
for select to authenticated using (true);

create policy if not exists security_deposits_insert on public.security_deposits
for insert to authenticated with check (true);

create policy if not exists security_deposits_update on public.security_deposits
for update to authenticated using (true) with check (true);

create policy if not exists deposit_transactions_select on public.deposit_transactions
for select to authenticated using (true);

create policy if not exists deposit_transactions_insert on public.deposit_transactions
for insert to authenticated with check (true);

create policy if not exists deposit_transactions_update on public.deposit_transactions
for update to authenticated using (true) with check (true);

create policy if not exists expenses_select on public.expenses
for select to authenticated using (true);

create policy if not exists expenses_insert on public.expenses
for insert to authenticated with check (true);

create policy if not exists expenses_update on public.expenses
for update to authenticated using (true) with check (true);

create policy if not exists vehicle_obligations_select on public.vehicle_obligations
for select to authenticated using (true);

create policy if not exists vehicle_obligations_insert on public.vehicle_obligations
for insert to authenticated with check (true);

create policy if not exists vehicle_obligations_update on public.vehicle_obligations
for update to authenticated using (true) with check (true);

create policy if not exists vehicle_fund_transactions_select on public.vehicle_fund_transactions
for select to authenticated using (true);

create policy if not exists vehicle_fund_transactions_insert on public.vehicle_fund_transactions
for insert to authenticated with check (true);

create policy if not exists vehicle_fund_transactions_update on public.vehicle_fund_transactions
for update to authenticated using (true) with check (true);

create policy if not exists contracts_select on public.contracts
for select to authenticated using (true);

create policy if not exists contracts_insert on public.contracts
for insert to authenticated with check (true);

create policy if not exists contracts_update on public.contracts
for update to authenticated using (true) with check (true);

create policy if not exists documents_select on public.documents
for select to authenticated using (true);

create policy if not exists documents_insert on public.documents
for insert to authenticated with check (true);

create policy if not exists documents_update on public.documents
for update to authenticated using (true) with check (true);

create policy if not exists alerts_select on public.alerts
for select to authenticated using (true);

create policy if not exists alerts_insert on public.alerts
for insert to authenticated with check (true);

create policy if not exists alerts_update on public.alerts
for update to authenticated using (true) with check (true);

create policy if not exists audit_logs_select on public.audit_logs
for select to authenticated using (true);

create policy if not exists audit_logs_insert on public.audit_logs
for insert to authenticated with check (true);

create policy if not exists audit_logs_update on public.audit_logs
for update to authenticated using (true) with check (true);
