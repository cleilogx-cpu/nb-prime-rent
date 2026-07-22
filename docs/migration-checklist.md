# Checklist de migração — versão 1.0

## 1. Backup antes da migração
- [ ] Fazer backup completo do banco Supabase;
- [ ] Exportar dados críticos de vehicles, payments, expenses e qualquer tabela existente;
- [ ] Garantir backup do storage para documentos e comprovantes;
- [ ] Registrar a revisão do estado atual antes da mudança.

## 2. Revisão do SQL
- [ ] Revisar o rascunho em supabase/migrations/001_v1_schema_draft.sql;
- [ ] Confirmar que não há exclusão de tabelas atuais;
- [ ] Validar que as novas tabelas são compatíveis com os dados existentes;
- [ ] Revisar tipos, nomes e constraints;
- [ ] Confirmar que os campos monetários usam numeric(12,2).

## 3. Execução em ambiente de teste
- [ ] Aplicar a migração em ambiente de teste;
- [ ] Validar criação de tabelas e triggers;
- [ ] Validar políticas RLS;
- [ ] Testar inserts e updates básicos;
- [ ] Revisar se o SQL é idempotente.

## 4. Conferência dos veículos atuais
- [ ] Validar os dois veículos existentes na tabela atual;
- [ ] Confirmar placa, modelo, cor, locatário e status;
- [ ] Verificar o campo finance_model atual;
- [ ] Mapear o fluxo de compatibilidade para os novos modelos.

## 5. Criação dos perfis de Clei e Edson
- [ ] Criar perfil para Clei como administrador;
- [ ] Criar perfil para Edson como sócio;
- [ ] Validar a associação entre auth users e profiles.

## 6. Validação das políticas RLS
- [ ] Confirmar que não há políticas abertas ao público;
- [ ] Validar que apenas usuários authenticated conseguem acessar;
- [ ] Testar leitura, escrita e atualização por perfil;
- [ ] Revisar se documentos privados permanecem protegidos.

## 7. Testes de login
- [ ] Testar login com usuário autenticado;
- [ ] Validar carregamento de perfil;
- [ ] Confirmar que o acesso por papel funciona corretamente;
- [ ] Testar login para usuário sem perfil.

## 8. Testes financeiros
- [ ] Criar recebimento no modelo partners;
- [ ] Criar recebimento no modelo savings;
- [ ] Realizar saque do fundo;
- [ ] Criar despesa e obrigação;
- [ ] Validar auditoria financeira.

## 9. Plano de reversão
- [ ] Registrar rollback das migrações aplicadas;
- [ ] Manter backup e exportação de dados;
- [ ] Definir procedimento para reverter políticas e tabelas adicionadas;
- [ ] Documentar dependências críticas antes da execução.
