# Arquitetura da versão 1.0 — NB Prime Rent

## 1. Visão geral

A versão 1.0 do NB Prime Rent concentra-se exclusivamente na gestão de locação de veículos da NB Prime Capital. O objetivo é oferecer um sistema de operação financeira e operacional com autenticação individual, controle de veículos, locatários, locações, recebimentos, cauções, despesas, fundo do veículo, obrigações mensais, contratos, documentos, alertas, auditoria e relatórios.

O sistema deve ser construído para crescer em etapas, preservando o estado atual do negócio e permitindo evolução futura sem perder histórico.

## 2. Objetivos do sistema

- centralizar o controle operacional e financeiro de veículos locados;
- separar claramente dados de veículo, locatário, locação e operações financeiras;
- suportar os dois modelos financeiros do negócio: partners e savings;
- manter auditoria obrigatória para qualquer ação financeira;
- garantir segurança com autenticação, autorização e políticas RLS no Supabase;
- preservar histórico sem recalcular entradas antigas quando regras futuras mudarem.

## 3. Módulos da versão 1.0

1. Autenticação e usuários
2. Dashboard
3. Veículos
4. Locatários
5. Locações
6. Recebimentos
7. Cauções
8. Despesas
9. Fundo do veículo
10. Obrigações mensais
11. Manutenções
12. Contratos
13. Documentos
14. Alertas e agenda
15. Auditoria
16. Relatórios

## 4. Responsabilidades por camada

### Front-end
- renderizar telas e componentes de negócio;
- consumir serviços do Supabase;
- aplicar validações locais e feedback ao usuário;
- orquestrar workflows como criação de locação e geração de contrato;
- não realizar operações sensíveis fora do fluxo autenticado.

### Back-end / serviços
- expor acesso padronizado a dados via Supabase client;
- encapsular regras de negócio simples;
- registrar auditoria;
- centralizar chamadas a storage, tabelas e RPCs futuras.

### Banco de dados
- armazenar dados transacionais e históricos;
- garantir integridade relacional;
- implementar políticas de segurança via RLS;
- preservar dados antigos e impedir exclusões inconsistentes.

## 5. Arquitetura do front-end

A aplicação seguirá a estrutura atual em React + Vite + JavaScript e manterá o padrão visual já existente. A nova arquitetura deverá ser modular e orientada por domínio.

### Padrão recomendado
- páginas por módulo;
- componentes reutilizáveis;
- hooks para leitura de sessão e autorização;
- services para encapsular chamadas ao Supabase;
- helpers para formatação, validação e regras de exibição.

### Princípios
- componentes pequenos e reutilizáveis;
- regras de negócio centralizadas em services ou hooks;
- separação entre telas, componentes e integrações;
- feedback visual para loading, erro e sucesso;
- responsividade mobile-first.

## 6. Serviços esperados

Os serviços devem ser organizados por domínio, por exemplo:
- authService
- vehiclesService
- tenantsService
- rentalsService
- paymentsService
- depositsService
- expensesService
- vehicleFundService
- obligationsService
- contractsService
- documentsService
- alertsService
- auditService
- reportsService

## 7. Rotas sugeridas

- /login
- /
- /vehicles
- /tenants
- /rentals
- /payments
- /deposits
- /expenses
- /fund
- /obligations
- /maintenance
- /contracts
- /documents
- /alerts
- /audit
- /reports

## 8. Estrutura de pastas

```text
src/
  components/
  hooks/
  layouts/
  pages/
  services/
  lib/
  utils/
  styles/
```

A estrutura atual já está compatível com essa evolução, e os novos módulos devem seguir o mesmo padrão.

## 9. Fluxo de autenticação

1. O usuário entra com credenciais no sistema.
2. O Supabase autentica o usuário.
3. O perfil do usuário é carregado a partir da tabela profiles.
4. O sistema define permissões de administrador, sócio ou funcionário.
5. O acesso às rotas e ações é validado com base nas permissões.

### Regras de autorização
- Clei: administrador.
- Edson: sócio com permissões de lançar e editar operações autorizadas.
- Funcionários: acesso limitado a módulos específicos.

## 10. Estratégia de erros e carregamento

- telas devem exibir loading state enquanto aguardam dados reais;
- erros de conexão devem ser apresentados com mensagens claras;
- erros de validação devem aparecer no formulário localmente;
- falhas de escrita devem mostrar mensagem e registrar auditoria quando possível;
- transações financeiras nunca devem ser “silenciosas” em caso de falha.

## 11. Estratégia de auditoria

A auditoria será obrigatória em todas as operações financeiras e em mudanças sensíveis de configuração.

### Campos mínimos recomendados
- user_id
- action
- entity
- entity_id
- previous_values
- new_values
- created_at
- reason

### Regras
- criar registro em toda alteração ou exclusão lógica;
- registrar operação financeira antes e depois do estado;
- preservar histórico imutável;
- rejeitar alterações financeiras sem auditoria.

## 12. Segurança e RLS

- todas as operações devem exigir usuário autenticado;
- nenhuma política deve ser aberta ao público;
- o acesso deve ser controlado por perfil e por contexto do dado;
- políticas de leitura, escrita e atualização devem ser específicas por tabela;
- permissões por perfil devem ser revisadas em cada módulo.

### Estratégia recomendada
- profiles para identidade e perfil;
- RLS com políticas baseadas em user_id e papel;
- uso de service_role apenas em processos administrativos e backend controlado, nunca no front-end.

## 13. Estratégia de documentos privados

Documentos privados devem ser armazenados no Supabase Storage em buckets privados.

### Regras
- os buckets devem ser privados;
- o acesso deve depender de autenticação;
- o upload e a leitura devem ser controlados por políticas específicas;
- cada documento deve ser vinculado ao registro correspondente.

### Exemplos de documentos
- CNH
- comprovante de residência
- CRLV
- seguro
- contrato
- vistoria
- fotos
- comprovantes financeiros

## 14. Estratégia de backup

- backup periódico do banco e arquivos de storage;
- exportação regular de dados críticos;
- revisão de procedimentos antes de alterações estruturais;
- execução de migrações em ambiente de teste antes do ambiente produtivo;
- documentação de rollback para mudanças relevantes.
