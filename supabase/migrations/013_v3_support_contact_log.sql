-- Ajuda e contato (Fale conosco): registro mínimo só pra limitar abuso
-- (máx. 5 mensagens por hora por usuário, checado em api/support/contact.js).
-- NÃO guarda o texto da mensagem -- só quem enviou e quando. RLS ligada e
-- nenhuma política: o app (anon/authenticated) não enxerga nem escreve nada
-- aqui, só a função de servidor, via service_role (que ignora RLS).

create table if not exists public.support_contact_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists support_contact_log_user_created_idx
  on public.support_contact_log (user_id, created_at desc);

alter table public.support_contact_log enable row level security;
