# Modelo de dados da versão 1.0 — NB Prime Rent

## 1. Objetivo

Este documento descreve a proposta de modelagem de dados para a versão 1.0 do sistema de locação de veículos da NB Prime Capital. A proposta prioriza clareza de domínio, preservação de histórico e separação entre operações operacionais e financeiras.

## 2. Entidades principais

### profiles
Tabela de identidade do usuário autenticado.

Campos essenciais:
- id uuid primary key
- full_name text
- role text
- is_active boolean
- created_at timestamptz
- updated_at timestamptz

### vehicles
Entidade principal de veículos.

Campos essenciais:
- id uuid primary key
- plate text
- brand text
- model text
- version text
- year integer
- color text
- chassis text
- renavam text
- current_km numeric
- next_review_km numeric
- status text
- weekly_rent numeric(12,2)
- finance_model text
- main_photo_url text
- observations text
- created_at timestamptz
- updated_at timestamptz

### tenants
Entidade própria para locatários.

Campos essenciais:
- id uuid primary key
- full_name text
- cpf text
- rg text
- birth_date date
- cnh_number text
- cnh_category text
- cnh_validity date
- phone text
- whatsapp text
- email text
- address text
- emergency_contact text
- pix_key text
- status text
- observations text
- created_at timestamptz
- updated_at timestamptz

### rentals
Entidade de locação para preservar histórico.

Campos essenciais:
- id uuid primary key
- vehicle_id uuid references vehicles(id)
- tenant_id uuid references tenants(id)
- contract_id uuid nullable
- start_date date
- expected_end_date date
- weekly_rent numeric(12,2)
- billing_day integer
- security_deposit_amount numeric(12,2)
- periodicity text
- status text
- financial_conditions text
- observations text
- created_at timestamptz
- updated_at timestamptz

### payments
Tabela revisada para receber pagamentos e controlar o destino financeiro.

Campos essenciais:
- id uuid primary key
- rental_id uuid references rentals(id)
- vehicle_id uuid references vehicles(id)
- tenant_id uuid references tenants(id)
- reference_period text
- expected_date date
- received_date date
- expected_amount numeric(12,2)
- received_amount numeric(12,2)
- payment_type text
- payment_method text
- status text
- financial_destination text
- beneficiary_partner text nullable
- vehicle_fund_id uuid nullable
- observations text
- proof_url text
- created_by uuid references profiles(id)
- created_at timestamptz
- updated_at timestamptz

### security_deposits
Controle das cauções.

Campos essenciais:
- id uuid primary key
- rental_id uuid references rentals(id)
- vehicle_id uuid references vehicles(id)
- contracted_amount numeric(12,2)
- total_received numeric(12,2)
- total_credited numeric(12,2)
- total_returned numeric(12,2)
- balance numeric(12,2)
- pending_amount numeric(12,2)
- status text
- created_at timestamptz
- updated_at timestamptz

### deposit_transactions
Movimentações da caução.

Campos essenciais:
- id uuid primary key
- security_deposit_id uuid references security_deposits(id)
- transaction_type text
- amount numeric(12,2)
- description text
- occurred_at timestamptz
- created_by uuid references profiles(id)
- created_at timestamptz
- updated_at timestamptz

### expenses
Despesas do negócio e dos veículos.

Campos essenciais:
- id uuid primary key
- vehicle_id uuid references vehicles(id)
- rental_id uuid nullable references rentals(id)
- category text
- description text
- amount numeric(12,2)
- expense_date date
- funding_source text
- payment_method text
- proof_url text
- status text
- recurring boolean
- created_by uuid references profiles(id)
- created_at timestamptz
- updated_at timestamptz

### vehicle_obligations
Obrigações mensais vinculadas ao veículo.

Campos essenciais:
- id uuid primary key
- vehicle_id uuid references vehicles(id)
- description text
- category text
- creditor text
- amount numeric(12,2)
- due_date date
- frequency text
- installments_total integer
- current_installment integer
- start_date date
- end_date date
- status text
- payment_origin text
- created_at timestamptz
- updated_at timestamptz

### vehicle_fund_transactions
Movimentações do fundo do veículo.

Campos essenciais:
- id uuid primary key
- vehicle_id uuid references vehicles(id)
- rental_id uuid nullable references rentals(id)
- transaction_type text
- amount numeric(12,2)
- description text
- transaction_date date
- purpose text
- created_by uuid references profiles(id)
- created_at timestamptz
- updated_at timestamptz

### contracts
Contratos e versões.

Campos essenciais:
- id uuid primary key
- rental_id uuid references rentals(id)
- tenant_id uuid references tenants(id)
- vehicle_id uuid references vehicles(id)
- contract_template text
- generated_pdf_url text
- version_number integer
- status text
- start_date date
- end_date date
- renewal_count integer
- created_at timestamptz
- updated_at timestamptz

### documents
Documentos privados.

Campos essenciais:
- id uuid primary key
- entity_type text
- entity_id uuid
- document_type text
- storage_path text
- uploaded_by uuid references profiles(id)
- created_at timestamptz
- updated_at timestamptz

### alerts
Alertas e agenda.

Campos essenciais:
- id uuid primary key
- vehicle_id uuid nullable references vehicles(id)
- rental_id uuid nullable references rentals(id)
- alert_type text
- title text
- message text
- due_date date
- priority text
- status text
- created_by uuid references profiles(id)
- created_at timestamptz
- updated_at timestamptz

### audit_logs
Auditoria geral.

Campos essenciais:
- id uuid primary key
- user_id uuid references profiles(id)
- action text
- entity text
- entity_id uuid
- previous_values jsonb
- new_values jsonb
- created_at timestamptz
- reason text

## 3. Relacionamentos

- vehicles 1:N rentals
- tenants 1:N rentals
- rentals 1:N payments
- rentals 1:1 security_deposits
- security_deposits 1:N deposit_transactions
- vehicles 1:N expenses
- rentals 1:N expenses
- vehicles 1:N vehicle_obligations
- vehicles 1:N vehicle_fund_transactions
- rentals 1:N contracts
- tenants 1:N contracts
- vehicles 1:N contracts
- vehicles 1:N alerts
- rentals 1:N alerts
- profiles 1:N audit_logs

## 4. Regras de integridade

- uma locação ativa por veículo por vez;
- recebimentos financeiros devem referenciar locação e veículo;
- exclusões financeiras preferencialmente devem ser cancelamentos lógicos;
- auditoria é obrigatória para operações financeiras;
- pagamentos no modelo partners devem registrar o beneficiário;
- pagamentos no modelo savings devem registrar o fundo do veículo;
- qualquer exclusão de registro financeiro deve deixar rastreabilidade.

## 5. Campos atuais de vehicles que serão mantidos temporariamente

Os campos existentes na tabela atual vehicles devem ser preservados no curto prazo para evitar perda de dados, com a seguinte estratégia:
- placa, model, color, tenant_name, tenant_phone, weekly_rent, finance_model, next_payment, next_destination, deposit_expected, deposit_received, deposit_expenses, current_km, next_review_km, status, created_at, updated_at serão mantidos como compatibilidade inicial;
- os novos campos de locatário, contrato, documentação e fundo serão adicionados sem apagar os dados existentes;
- a tabela antiga não deve ser substituída abruptamente; a migração deve ser incremental.

## 6. Plano de migração sem perda dos dois veículos existentes

1. Criar novas tabelas sem apagar a tabela vehicles atual.
2. Migrar os veículos atuais para a nova estrutura de vehicles, preservando dados já existentes.
3. Criar registros mínimos em profiles para Clei e Edson.
4. Criar uma locação inicial para cada veículo existente, se necessário, com o locatário atual vindo do campo tenant_name temporariamente.
5. Mapear os campos antigos para os novos modelos sem perda.
6. Validar a consistência antes de desativar qualquer campo legado.

## 7. Decisões de normalização

- locatários deixam de ser texto em vehicles;
- locações passam a ser entidade independente para preservar histórico;
- cauções deixam de ser campos acumulados em vehicles;
- fundos e obrigações passam a ser transacionais e rastreáveis;
- documentos são tratados como entidades separadas vinculadas por referência.
