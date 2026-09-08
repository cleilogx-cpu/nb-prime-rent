-- PR 3 — Cobranças/Vencimentos (contract_charges) e Caução (contract_deposits).
-- Preflight já confirmou: `deposits`/`contract_deposits`/`contract_charges`
-- não existem. Existe uma tabela órfã `rental_deposits` (1 linha, de sessão
-- anterior mexendo direto na UI, não referenciada por nenhum código) com a
-- caução esperada do Julio Cesar (R$2.000) -- já bate com
-- contracts.deposit_amount, que é a fonte usada no backfill abaixo. Não
-- mexemos em `rental_deposits`, só não a usamos.

create table if not exists public.contract_charges (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  rental_id uuid references public.rentals(id),
  vehicle_id uuid not null references public.vehicles(id),
  tenant_id uuid not null references public.tenants(id),
  sequence_number integer not null,
  due_date date not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'Pendente',
  paid_payment_id uuid references public.rental_payments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, sequence_number)
);

create index if not exists contract_charges_status_due_date_idx on public.contract_charges(status, due_date);
create index if not exists contract_charges_rental_id_idx on public.contract_charges(rental_id);

alter table public.contract_charges enable row level security;
drop policy if exists contract_charges_select on public.contract_charges;
create policy contract_charges_select on public.contract_charges for select to authenticated using (true);
drop policy if exists contract_charges_insert on public.contract_charges;
create policy contract_charges_insert on public.contract_charges for insert to authenticated with check (true);
drop policy if exists contract_charges_update on public.contract_charges;
create policy contract_charges_update on public.contract_charges for update to authenticated using (true) with check (true);

create table if not exists public.contract_deposits (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null unique references public.contracts(id),
  vehicle_id uuid not null references public.vehicles(id),
  tenant_id uuid not null references public.tenants(id),
  total_amount numeric(12,2) not null default 0,
  received_amount numeric(12,2) not null default 0,
  status text not null default 'Pendente',
  agreed_terms text,
  refund_amount numeric(12,2),
  refund_date date,
  refund_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contract_deposits_contract_id_idx on public.contract_deposits(contract_id);

alter table public.contract_deposits enable row level security;
drop policy if exists contract_deposits_select on public.contract_deposits;
create policy contract_deposits_select on public.contract_deposits for select to authenticated using (true);
drop policy if exists contract_deposits_insert on public.contract_deposits;
create policy contract_deposits_insert on public.contract_deposits for insert to authenticated with check (true);
drop policy if exists contract_deposits_update on public.contract_deposits;
create policy contract_deposits_update on public.contract_deposits for update to authenticated using (true) with check (true);

alter table public.rental_payments add column if not exists charge_id uuid references public.contract_charges(id);
alter table public.rental_payments add column if not exists contract_id uuid references public.contracts(id);
alter table public.expenses add column if not exists rental_id uuid references public.rentals(id);

-- Backfill contract_id nos 10 rental_payments existentes, a partir do rental_id.
update public.rental_payments rp
set contract_id = r.contract_id
from public.rentals r
where rp.rental_id = r.id and rp.contract_id is null;

-- Cobranças futuras pros contratos Ativo já existentes (Julio Cesar/UIZ9D65,
-- Francinei/UJB9A51, e qualquer outro real que já esteja Ativo). Só datas
-- >= hoje: não dá pra saber com segurança quais semanas passadas já foram
-- pagas pelo processo antigo, e inventar "atrasados" históricos falsos
-- seria pior que não ter nada.
with schedule as (
  select
    c.id as contract_id,
    c.rental_id,
    c.vehicle_id,
    c.tenant_id,
    c.payment_amount,
    row_number() over (partition by c.id order by gs.due_date) as sequence_number,
    gs.due_date::date as due_date
  from public.contracts c
  cross join lateral generate_series(
    c.start_date::timestamp,
    c.end_date::timestamp,
    case c.periodicity
      when 'daily' then interval '1 day'
      when 'biweekly' then interval '14 days'
      when 'monthly' then interval '1 month'
      else interval '7 days'
    end
  ) as gs(due_date)
  where c.status = 'Ativo'
)
insert into public.contract_charges (contract_id, rental_id, vehicle_id, tenant_id, sequence_number, due_date, amount, status)
select s.contract_id, s.rental_id, s.vehicle_id, s.tenant_id, s.sequence_number, s.due_date, s.payment_amount, 'Pendente'
from schedule s
where s.due_date >= current_date
  and not exists (
    select 1 from public.contract_charges cc
    where cc.contract_id = s.contract_id and cc.due_date = s.due_date
  );

-- Caução de todo contrato já existente (o valor vem de contracts.deposit_amount,
-- que já é a fonte real -- confirmado batendo com a tabela órfã rental_deposits
-- pro Julio Cesar, R$2.000 nos dois lugares).
insert into public.contract_deposits (contract_id, vehicle_id, tenant_id, total_amount, received_amount, status)
select
  c.id,
  c.vehicle_id,
  c.tenant_id,
  c.deposit_amount,
  coalesce((
    select sum(rp.amount) from public.rental_payments rp
    where rp.contract_id = c.id and rp.receipt_type = 'deposit' and rp.is_cancelled = false
  ), 0),
  'Pendente'
from public.contracts c
where not exists (select 1 from public.contract_deposits cd where cd.contract_id = c.id);

update public.contract_deposits set status = case
  when received_amount <= 0 then 'Pendente'
  when received_amount < total_amount then 'Parcial'
  when received_amount >= total_amount and total_amount > 0 then 'Quitada'
  else 'Pendente'
end;
