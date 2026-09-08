-- PR 1 — Status de veículo derivado do contrato + condição de manutenção
-- independente. "Alugado" continua sendo escrito só pelo app
-- (contractsService.signContract / locationsService.endLocation); esta
-- migração só adiciona a coluna nova e converte o que já existia de
-- "Manutenção"/"Inativo" (nenhum veículo real está nesse estado hoje,
-- conferido antes de rodar: AAA1234/UIZ9D65/UJB9A51 = Disponível/Alugado).

alter table public.vehicles add column if not exists maintenance boolean not null default false;

update public.vehicles set maintenance = true where lower(status) = 'manutenção';
update public.vehicles set status = 'Disponível' where lower(status) in ('manutenção', 'inativo');
