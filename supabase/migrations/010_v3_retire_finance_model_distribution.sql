-- Aposenta o conceito de "distribuição do aluguel" (sócios x fundo,
-- rodízio Clei/Edson) pra contratos e recebimentos NOVOS. Dado histórico
-- não é tocado -- só afrouxa a obrigatoriedade das colunas pra permitir
-- gravar null daqui pra frente. Nada é apagado, nenhuma linha existente é
-- alterada. rental_payments.finance_model/destination já eram NOT NULL sem
-- default (tabela pré-existente em produção, fora de qualquer migração
-- deste repositório); contracts.finance_model tinha default 'partners' --
-- removido também, pra "não informado" virar null de verdade, não um
-- 'partners' silencioso que a UI nunca chegou a mostrar ao operador.

alter table public.contracts alter column finance_model drop not null;
alter table public.contracts alter column finance_model drop default;
alter table public.rental_payments alter column finance_model drop not null;
alter table public.rental_payments alter column destination drop not null;
