-- Checklist operacional da locação: 3 providências (CRLV compartilhado,
-- principal condutor indicado, aceite do principal condutor), cada uma com
-- status + data/hora + e-mail de quem marcou. Não bloqueia nada -- é só
-- lembrete pro operador (Dashboard > Pendências).
--
-- Colunas entram SEM default primeiro: locações já encerradas ficam com
-- null ("sem registro"), em vez de virar "pendente/não feito" por engano.
-- Locações ATIVAS hoje são inicializadas como pendentes (false) pro operador
-- atualizar a situação real. O default false só vale daqui pra frente
-- (toda locação nova criada em contractsService.signContract nasce
-- pendente sozinha, sem precisar mudar o código que cria a locação).

alter table public.rentals
  add column if not exists crlv_shared boolean,
  add column if not exists crlv_shared_at timestamptz,
  add column if not exists crlv_shared_by text,
  add column if not exists primary_driver_indicated boolean,
  add column if not exists primary_driver_indicated_at timestamptz,
  add column if not exists primary_driver_indicated_by text,
  add column if not exists primary_driver_accepted boolean,
  add column if not exists primary_driver_accepted_at timestamptz,
  add column if not exists primary_driver_accepted_by text;

update public.rentals
set crlv_shared = false,
    primary_driver_indicated = false,
    primary_driver_accepted = false
where status = 'Ativa'
  and crlv_shared is null
  and primary_driver_indicated is null
  and primary_driver_accepted is null;

alter table public.rentals alter column crlv_shared set default false;
alter table public.rentals alter column primary_driver_indicated set default false;
alter table public.rentals alter column primary_driver_accepted set default false;
