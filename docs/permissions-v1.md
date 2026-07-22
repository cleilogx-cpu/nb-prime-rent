# Permissões da versão 1.0 — NB Prime Rent

## 1. Papéis propostos

### Administrador
- Clei
- acesso total ao sistema
- pode criar, editar, excluir e revisar operações sensíveis
- pode gerenciar usuários e perfis
- pode revisar auditoria

### Sócio
- Edson
- pode lançar e editar operações autorizadas
- pode visualizar relatórios e dados financeiros
- pode aprovar ou revisar operações de rotina
- pode não ter acesso a gerenciamento completo de perfis

### Funcionário
- acesso limitado
- pode executar operações operacionais específicas, como cadastro de veículos, locatários e recebimentos básicos
- não pode alterar dados sensíveis de auditoria ou permissões
- pode ter acesso restrito por módulo

## 2. Matriz de permissões por módulo

| Módulo | Administrador | Sócio | Funcionário |
|---|---|---|---|
| Autenticação e usuários | CRUD completo | leitura e edição limitada | leitura limitada |
| Dashboard | leitura total | leitura total | leitura limitada |
| Veículos | CRUD | CRUD limitado | leitura e edição limitada |
| Locatários | CRUD | CRUD limitado | leitura e edição limitada |
| Locações | CRUD | CRUD limitado | leitura e edição limitada |
| Recebimentos | CRUD | CRUD | leitura e lançamento limitado |
| Cauções | CRUD | CRUD | leitura e edição limitada |
| Despesas | CRUD | CRUD | leitura e criação limitada |
| Fundo do veículo | CRUD | CRUD | leitura e saque limitado |
| Obrigações mensais | CRUD | CRUD | leitura |
| Manutenções | CRUD | CRUD | leitura e edição limitada |
| Contratos | CRUD | CRUD | leitura e geração limitada |
| Documentos | CRUD | CRUD limitado | leitura limitada |
| Alertas e agenda | CRUD | CRUD | leitura |
| Auditoria | leitura total | leitura limitada | nenhuma |
| Relatórios | leitura total | leitura total | leitura limitada |

## 3. Regras de ação

### Criar
- administrador: permitido em todos os módulos
- sócio: permitido em módulos financeiros e operacionais principais
- funcionário: permitido apenas em operações autorizadas

### Editar
- administrador: permitido sem restrição
- sócio: permitido para registros e operações autorizadas
- funcionário: permitido apenas quando houver regra explícita

### Excluir
- administrador: permitido apenas quando houver justificativa e auditoria
- sócio: preferencialmente cancelamento lógico, não exclusão física
- funcionário: não permitido para dados financeiros sensíveis

## 4. Regras adicionais

- operações financeiras exigem auditoria obrigatória;
- alterações de permissões devem ser feitas apenas por administrador;
- cada usuário deve possuir login individual;
- o acesso a documentos privados deve depender do usuário autenticado;
- futuras permissões de funcionário devem ser refinadas conforme necessidade operacional.
