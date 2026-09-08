-- PR 2 — Endereço estruturado do locatário + periodicidade de pagamento.
-- ATENÇÃO: renomeia weekly_rent -> payment_amount em contracts e rentals.
-- Rode isso ANTES de atualizar o código em produção (corte coordenado) --
-- o código deste PR já espera `payment_amount`/`periodicity`, não
-- `weekly_rent`. Como só tem 3 contratos/3 locações reais, o risco de
-- dado é zero (é um rename puro, sem perda de valor).

alter table public.tenants add column if not exists address_street text;
alter table public.tenants add column if not exists address_number text;
alter table public.tenants add column if not exists address_neighborhood text;
alter table public.tenants add column if not exists address_zip text;
alter table public.tenants add column if not exists address_complement text;
alter table public.tenants add column if not exists address_city text;
alter table public.tenants add column if not exists address_state text;
-- campo antigo `address` fica como está, só como fallback de exibição pros
-- locatários já cadastrados.

alter table public.contracts rename column weekly_rent to payment_amount;
alter table public.contracts add column if not exists periodicity text not null default 'weekly';

alter table public.rentals rename column weekly_rent to payment_amount;
alter table public.rentals add column if not exists periodicity text not null default 'weekly';
