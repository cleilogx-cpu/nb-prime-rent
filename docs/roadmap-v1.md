# Roadmap da versão 1.0 — NB Prime Rent

## 1. Estratégia geral

A implementação deve ser dividida em sprints pequenas, testáveis e com dependências claras. A ordem abaixo prioriza a estrutura de dados e os módulos centrais antes de expor telas e relatórios mais completos.

## 2. Sprint 1 — Fundamentos

Objetivos:
- autenticação e usuários;
- perfil de Clei e Edson;
- estrutura inicial de profiles e audit_logs;
- segurança e RLS inicial.

## 3. Sprint 2 — Veículos e locatários

Objetivos:
- vehicles expandido;
- tenants;
- cadastro básico de veículos e locatários;
- integração com telas existentes sem alterar o fluxo atual.

## 4. Sprint 3 — Locações e contratos

Objetivos:
- rentals;
- contratos;
- vinculação entre veículo, locatário e locação;
- geração de contrato inicial.

## 5. Sprint 4 — Recebimentos e cauções

Objetivos:
- payments;
- security_deposits;
- deposit_transactions;
- fluxo partners e savings;
- auditoria financeira obrigatória.

## 6. Sprint 5 — Despesas e obrigações

Objetivos:
- expenses;
- vehicle_obligations;
- origem do recurso e status;
- integração ao dashboard financeiro.

## 7. Sprint 6 — Fundo do veículo

Objetivos:
- vehicle_fund_transactions;
- saldo calculado por movimentações;
- saque mensal;
- cálculo de saldo disponível e restante.

## 8. Sprint 7 — Documentos, alertas e agenda

Objetivos:
- documents;
- alerts;
- armazenamento privado no Supabase Storage;
- alertas de vencimento e revisão.

## 9. Sprint 8 — Relatórios e dashboard avançado

Objetivos:
- relatórios financeiros;
- painel executivo;
- resumo por veículo, recebimentos e inadimplência.

## 10. Dependências recomendadas

- autenticação antes dos demais módulos;
- veículos antes de locações;
- locatários antes de locações;
- locações antes de recebimentos e contratos;
- fundo do veículo depois de recebimentos e despesas;
- auditoria transversal a todos os módulos.
