-- ESTE ARQUIVO JÁ FOI EXECUTADO NA PRODUÇÃO (Supabase "Dolphin Rent"), em 5
-- pedaços separados, no dia da migração real. Documentado aqui como registro
-- do que existe de verdade no banco — não precisa rodar de novo.
--
-- Descoberta importante feita durante a execução real: o banco de produção
-- já tinha tabelas que não estavam em nenhum arquivo de migração anterior
-- (rental_payments, locations, rental_deposits, e tabelas de um projeto
-- completamente diferente misturadas no mesmo Supabase — clients, cuts,
-- profiles). A migração abaixo foi ajustada para conviver com isso:
-- ela cria tenants/contracts/rentals do zero, migra os dados reais da
-- tabela antiga `locations` (2 locações: Julio e Francinei), e só então
-- renomeia os campos antigos do veículo para legacy_*.

-- =========================================================
-- PEDAÇO 1 — tabelas novas (tenants, contracts, rentals)
-- =========================================================

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text,
  rg text,
  phone text,
  whatsapp text,
  email text,
  address text,
  cnh_number text,
  cnh_validity date,
  pix_key text,
  status text not null default 'active',
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text unique,
  vehicle_id uuid not null references public.vehicles(id),
  tenant_id uuid not null references public.tenants(id),
  previous_contract_id uuid references public.contracts(id),
  start_date date not null,
  end_date date,
  weekly_rent numeric(12,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  initial_km integer,
  billing_day integer,
  clauses text,
  observations text,
  signed_document_url text,
  status text not null default 'Rascunho',
  finance_model text not null default 'partners',
  weeks integer,
  rental_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rentals (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  vehicle_id uuid not null references public.vehicles(id),
  tenant_id uuid not null references public.tenants(id),
  start_date date not null,
  expected_end_date date,
  initial_km integer,
  weekly_rent numeric(12,2) not null default 0,
  status text not null default 'Ativa',
  actual_end_date date,
  final_km integer,
  tenant_rating text,
  closing_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- PEDAÇO 2 — colunas novas em tabelas que já existiam
-- =========================================================

alter table public.vehicles add column if not exists year integer;
alter table public.vehicles add column if not exists chassis text;
alter table public.rental_payments add column if not exists rental_id uuid;
alter table public.rental_payments add column if not exists tenant_id uuid;

-- =========================================================
-- PEDAÇO 3 — migração dos dados reais (a partir da tabela antiga `locations`)
-- =========================================================

do $$
declare
  loc record;
  new_tenant_id uuid;
  new_contract_id uuid;
  new_rental_id uuid;
  contract_num text;
  computed_end_date date;
begin
  for loc in
    select l.*, v.tenant_phone, v.deposit_received, v.current_km
    from public.locations l
    join public.vehicles v on v.id = l.vehicle_id
    where l.status = 'Ativo'
  loop
    if exists (select 1 from public.rentals r where r.vehicle_id = loc.vehicle_id and r.status = 'Ativa') then
      continue;
    end if;

    insert into public.tenants (full_name, phone, status)
    values (loc.tenant_name, loc.tenant_phone, 'active')
    returning id into new_tenant_id;

    contract_num := 'NB-MIGR-' || to_char(current_date, 'YYYY') || '-' || substr(loc.vehicle_id::text, 1, 4);
    computed_end_date := coalesce(loc.end_date, (loc.start_date + interval '3 months')::date);

    insert into public.contracts (
      contract_number, vehicle_id, tenant_id, start_date, end_date,
      weekly_rent, deposit_amount, initial_km, observations, status, finance_model
    ) values (
      contract_num, loc.vehicle_id, new_tenant_id, loc.start_date, computed_end_date,
      loc.weekly_rent, coalesce(loc.deposit_received, 0), loc.current_km,
      'Contrato gerado automaticamente pela migração estrutural, a partir da locação antiga. Confirme prazo final e caução.',
      'Ativo', 'partners'
    )
    returning id into new_contract_id;

    insert into public.rentals (
      contract_id, vehicle_id, tenant_id, start_date, expected_end_date,
      initial_km, weekly_rent, status
    ) values (
      new_contract_id, loc.vehicle_id, new_tenant_id, loc.start_date, computed_end_date,
      loc.current_km, loc.weekly_rent, 'Ativa'
    )
    returning id into new_rental_id;

    update public.contracts set rental_id = new_rental_id where id = new_contract_id;
  end loop;
end $$;

-- =========================================================
-- PEDAÇO 4 — renomeia campos antigos do veículo (nada apagado)
-- =========================================================

alter table public.vehicles rename column tenant_name to legacy_tenant_name;
alter table public.vehicles rename column tenant_phone to legacy_tenant_phone;
alter table public.vehicles rename column weekly_rent to legacy_weekly_rent;
alter table public.vehicles rename column finance_model to legacy_finance_model;
alter table public.vehicles rename column next_payment to legacy_next_payment;
alter table public.vehicles rename column deposit_expected to legacy_deposit_expected;
alter table public.vehicles rename column deposit_received to legacy_deposit_received;
alter table public.vehicles rename column deposit_expenses to legacy_deposit_expenses;

-- next_destination NÃO é renomeado — é a fila de rodízio Clei/Edson,
-- contínua por veículo, e continua em uso (ver paymentsService.js).

-- =========================================================
-- PEDAÇO 5 — segurança (RLS) das tabelas novas
-- =========================================================

alter table public.tenants enable row level security;
alter table public.contracts enable row level security;
alter table public.rentals enable row level security;

drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants for select to authenticated using (true);
drop policy if exists tenants_insert on public.tenants;
create policy tenants_insert on public.tenants for insert to authenticated with check (true);
drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants for update to authenticated using (true) with check (true);

drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select to authenticated using (true);
drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts for insert to authenticated with check (true);
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts for update to authenticated using (true) with check (true);

drop policy if exists rentals_select on public.rentals;
create policy rentals_select on public.rentals for select to authenticated using (true);
drop policy if exists rentals_insert on public.rentals;
create policy rentals_insert on public.rentals for insert to authenticated with check (true);
drop policy if exists rentals_update on public.rentals;
create policy rentals_update on public.rentals for update to authenticated using (true) with check (true);
