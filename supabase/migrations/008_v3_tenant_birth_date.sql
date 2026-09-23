-- Pacote consolidado de melhorias (fase 0) — data de nascimento do locatário.
-- Campo novo, aditivo, sem impacto em dado existente.

alter table public.tenants add column if not exists birth_date date;
