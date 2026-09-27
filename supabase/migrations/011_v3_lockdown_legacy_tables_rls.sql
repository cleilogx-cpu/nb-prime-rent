-- Auditoria de segurança (27/09/2026): fecha o acesso via app/API a 7
-- tabelas legadas que nenhuma tela do sistema atual lê ou escreve --
-- confirmado por busca em todo o src/ (nenhum .from('payments'),
-- .from('locations'), .from('maintenance'), .from('vehicle_maintenance'),
-- .from('expense_reimbursements'), .from('rental_deposits') ou
-- .from('rental_deposit_transactions')). Até aqui elas tinham política
-- `using(true)`/`auth.uid() IS NOT NULL` -- ou seja, qualquer uma das
-- poucas contas autenticadas do sistema conseguia ler/editar/apagar esses
-- dados (inclusive nome/placa/valor de locações antigas reais) sem
-- nenhuma tela do app precisar disso.
--
-- Nada aqui apaga tabela nem linha -- só remove as políticas de RLS, o
-- que fecha o acesso via chave anon/authenticated (app, API REST, SDK).
-- A service_role (usada só nas funções de servidor em api/) sempre
-- ignora RLS, então nada que já funciona no servidor é afetado. Se
-- alguma dessas tabelas for necessária de novo no futuro, basta recriar
-- a política.

drop policy if exists "payments_authenticated" on public.payments;

drop policy if exists "Authenticated users can view locations" on public.locations;

drop policy if exists "maintenance_authenticated" on public.maintenance;

drop policy if exists "authenticated can select vehicle maintenance" on public.vehicle_maintenance;
drop policy if exists "authenticated can insert vehicle maintenance" on public.vehicle_maintenance;
drop policy if exists "authenticated can update vehicle maintenance" on public.vehicle_maintenance;
drop policy if exists "authenticated can delete vehicle maintenance" on public.vehicle_maintenance;

drop policy if exists "Authenticated users can read reimbursements" on public.expense_reimbursements;
drop policy if exists "Authenticated users can insert reimbursements" on public.expense_reimbursements;
drop policy if exists "Authenticated users can update reimbursements" on public.expense_reimbursements;
drop policy if exists "Authenticated users can delete reimbursements" on public.expense_reimbursements;

drop policy if exists "authenticated can select rental deposits" on public.rental_deposits;
drop policy if exists "authenticated can insert rental deposits" on public.rental_deposits;
drop policy if exists "authenticated can update rental deposits" on public.rental_deposits;
drop policy if exists "authenticated can delete rental deposits" on public.rental_deposits;

drop policy if exists "authenticated can select rental deposit transactions" on public.rental_deposit_transactions;
drop policy if exists "authenticated can insert rental deposit transactions" on public.rental_deposit_transactions;
drop policy if exists "authenticated can update rental deposit transactions" on public.rental_deposit_transactions;
drop policy if exists "authenticated can delete rental deposit transactions" on public.rental_deposit_transactions;
