# Revisão de pré-migração — NB Prime Rent

## Objetivo

Este documento orienta a revisão da migração candidata em [supabase/migrations/002_v1_schema_reviewed.sql](supabase/migrations/002_v1_schema_reviewed.sql) antes de qualquer execução no Supabase.

## Resultados que devem ser conferidos

1. Verificar se as tabelas atuais existem no schema public:
   - vehicles
   - payments
   - expenses
   - maintenance
   - audit_logs
2. Validar colunas, tipos, valores padrão e nulabilidade das tabelas atuais.
3. Conferir constraints, FKs, índices, triggers e políticas RLS atuais.
4. Confirmar a quantidade de registros existentes para não haver perda de dados.
5. Listar placas e IDs dos veículos existentes para garantir preservação.
6. Validar a existência dos usuários autenticados em auth.users e a relação com eventuais perfis futuros.
7. Identificar se alguma coluna ou tabela atual conflita com o esquema novo.

## Incompatibilidades que impediriam a migração

A migração deve ser interrompida ou revisada se algum destes cenários ocorrer:

- a tabela atual `payments` ou `expenses` for substituída por uma nova tabela com o mesmo nome;
- houver perda de registros em `vehicles`, `payments`, `expenses`, `maintenance` ou `audit_logs`;
- as colunas essenciais de `vehicles` forem removidas ou renomeadas sem compatibilidade;
- a migração criar uma restrição que bloqueie registros existentes;
- a migração introduzir políticas RLS abertas para `public` ou `anon`;
- a migração não mantiver a tabela `audit_logs` atual e sua função histórica.

## Como confirmar que os dois veículos serão preservados

- executar a checagem somente leitura em [supabase/preflight/001_current_schema_check.sql](supabase/preflight/001_current_schema_check.sql);
- conferir a saída com os IDs e placas de `vehicles`;
- verificar que a migração não faz `DROP TABLE` nem `TRUNCATE` e que não cria uma nova tabela `vehicles` que substitua a atual;
- confirmar que qualquer nova tabela relacionada a veículos usa referências seguras e não altera os registros atuais.

## Como confirmar que Clei e Edson continuarão com acesso

- verificar se os usuários autenticados existentes continuam visíveis em `auth.users`;
- revisar se a migração não remove nem sobrescreve a tabela de perfis de usuários;
- confirmar que a criação de perfis futuros ficará em etapa posterior e controlada;
- garantir que o acesso por `authenticated` continue disponível sem depender de perfis criados automaticamente.

## Tabelas novas previstas pelo 002

O arquivo 002 cria estruturas novas para evolução gradual, sem apagar o estado atual:

- profiles
- tenants
- rentals
- rental_payments
- security_deposits
- deposit_transactions
- vehicle_expenses
- vehicle_obligations
- vehicle_fund_transactions
- contracts
- documents
- alerts

## Tabelas antigas mantidas temporariamente

As tabelas atuais devem permanecer e continuar sendo referência de compatibilidade:

- vehicles
- payments
- expenses
- maintenance
- audit_logs

## Plano para migrar dados antigos de payments e expenses posteriormente

1. Validar as colunas atuais em `payments` e `expenses`.
2. Mapear dados antigos para as novas tabelas compatíveis (`rental_payments` e `vehicle_expenses`).
3. Criar rotinas de transformação em lote com auditoria.
4. Preservar os registros originais em `payments` e `expenses` até que o fluxo novo esteja validado.
5. Usar cancelamento lógico nas novas operações financeiras enquanto a migração gradual estiver em andamento.
6. Realizar testes em ambiente de homologação antes de desativar qualquer fluxo antigo.

## Estratégia de reversão

- manter backup do estado atual do banco antes de qualquer migração;
- não aplicar a migração em produção sem revisão completa;
- conservar o SQL em arquivos versionados para possível rollback manual;
- se uma migração parcial causar problemas, reverter apenas as alterações novas, preservando as tabelas atuais;
- manter os dados antigos intactos em `payments`, `expenses`, `maintenance` e `audit_logs` até a validação completa.
