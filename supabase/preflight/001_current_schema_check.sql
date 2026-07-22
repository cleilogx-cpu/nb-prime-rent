-- Preflight: checagem SOMENTE LEITURA do schema atual do Supabase.
-- Este arquivo não realiza INSERT, UPDATE, DELETE, ALTER, DROP, TRUNCATE ou CREATE.
-- Objetivo: apoiar a revisão da migração 002 antes de qualquer execução.

-- 1) Listar tabelas do schema public
select schemaname, tablename
from pg_tables
where schemaname = 'public'
order by tablename;

-- 2) Verificar colunas, tipos, default e nulabilidade das tabelas-alvo
select
  c.table_name,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.column_default,
  c.is_nullable,
  c.ordinal_position
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('vehicles','payments','expenses','maintenance','audit_logs')
order by c.table_name, c.ordinal_position;

-- 3) Constraints existentes
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
 and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.table_name in ('vehicles','payments','expenses','maintenance','audit_logs')
order by tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 4) Chaves estrangeiras
select
  tc.table_name,
  kcu.column_name,
  ccu.table_name as referenced_table_name,
  ccu.column_name as referenced_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
 and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and tc.table_name in ('vehicles','payments','expenses','maintenance','audit_logs')
order by tc.table_name, kcu.column_name;

-- 5) Índices
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('vehicles','payments','expenses','maintenance','audit_logs')
order by tablename, indexname;

-- 6) Políticas RLS
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('vehicles','payments','expenses','maintenance','audit_logs')
order by tablename, policyname;

-- 7) Triggers
select
  event_object_schema as schema_name,
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('vehicles','payments','expenses','maintenance','audit_logs')
order by event_object_table, trigger_name;

-- 8) Quantidade de registros em cada tabela atual
select 'vehicles' as table_name, count(*) as row_count from public.vehicles
union all
select 'payments' as table_name, count(*) as row_count from public.payments
union all
select 'expenses' as table_name, count(*) as row_count from public.expenses
union all
select 'maintenance' as table_name, count(*) as row_count from public.maintenance
union all
select 'audit_logs' as table_name, count(*) as row_count from public.audit_logs;

-- 9) Placas e IDs dos veículos existentes
select id, plate
from public.vehicles
order by id;

-- 10) Usuários existentes em auth.users (apenas id e email)
select id, email
from auth.users
order by created_at;

-- 11) Possíveis conflitos com a migração revisada
select
  'vehicles' as object_name,
  'tabela atual' as object_type
where to_regclass('public.vehicles') is not null
union all
select
  'payments' as object_name,
  'tabela atual' as object_type
where to_regclass('public.payments') is not null
union all
select
  'expenses' as object_name,
  'tabela atual' as object_type
where to_regclass('public.expenses') is not null
union all
select
  'maintenance' as object_name,
  'tabela atual' as object_type
where to_regclass('public.maintenance') is not null
union all
select
  'audit_logs' as object_name,
  'tabela atual' as object_type
where to_regclass('public.audit_logs') is not null;
