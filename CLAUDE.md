# NB Prime Rent — contexto do projeto (handoff de sessão anterior no chat)

## Deploy Vercel — corrigido em 11/09/2026, não reabrir

O domínio de produção `nb-prime-rent.vercel.app` ficou **preso num rollback
manual de 06/08** (`7e73cfd`, código de ANTES da arquitetura V2) — ninguém
fez isso de propósito recentemente, foi um "Instant Rollback" antigo que
nunca foi desfeito. Sintoma: app quebrado com `column vehicles.tenant_name
does not exist` (nome de coluna de antes da migração 004). Cada merge de PR
desde então gerava um deployment "Production" novo e "Ready", mas o domínio
NUNCA seguia — o Vercel mantém rollbacks manuais fixados até serem desfeitos
explicitamente, e nem "Promote" nem "Redeploy" pelo menu de contexto
resolviam isso sozinhos (o aviso amarelo no Overview do projeto dizia "to
undo the rollback, promote to production or re-enable auto-assigning custom
domains", mas isso não é auto-explicativo).

**A causa raiz de verdade**: em Project Settings → Environments → Production,
"Auto-Assign Custom Production Domains" estava **Disabled**. Ativei esse
toggle e salvei — e a partir daí, um `git push` genuíno pro `main` (mesmo
um commit vazio, `git commit --allow-empty`) finalmente moveu o domínio
pro deployment novo e removeu o aviso de rollback. Promover um deployment
já existente pela UI, sozinho, não bastava.

**Se isso acontecer de novo** (app funcionando localmente mas quebrado no
domínio publicado, erro de coluna/schema que não bate com o código atual):
1. `curl -sD - -o /dev/null https://nb-prime-rent.vercel.app/` — se
   `X-Vercel-Cache: HIT` com `Age` grande (horas/dias), é isso.
2. Confira o Overview do projeto na Vercel — se tiver o aviso amarelo de
   rollback, é isso.
3. Vercel → Project Settings → Environments → Production → ligar
   "Auto-Assign Custom Production Domains" → Save.
4. `git commit --allow-empty -m "..." && git push origin main`.

## Segurança — corrigido em 11/09/2026, não reabrir

O projeto Supabase "Dolphin Rent" estava com **"Allow new users to sign up"
ATIVADO** e **"Confirm email" DESATIVADO** (Authentication → Sign In/
Providers). Como todas as políticas RLS das tabelas de negócio são
`for authenticated using (true)` (sem checar `auth.uid()`), isso permitia
que QUALQUER PESSOA na internet criasse conta via API (usando só a `anon
key`, pública, embutida no JS do site) e tivesse acesso total de leitura/
escrita a locatários (CPF, CNH, endereço), contratos e financeiro — sem
precisar de nenhuma tela do app. **"Allow new users to sign up" foi
desativado** (confirmado persistido). Novos usuários agora só podem ser
criados manualmente em Authentication → Users → Invite. NÃO reative isso
sem antes revisar as políticas RLS pra restringir por usuário/role.

Sistema de gestão de locação de veículos elétricos (frota da NB Prime Capital),
React + Vite + Tailwind + Supabase, deploy na Vercel. O dono do projeto
(cliente) não é desenvolvedor — explique tudo em português, de forma simples,
e sempre confirme antes de rodar SQL contra o banco de produção.

## Arquitetura decidida (confirmada com o cliente)

Veículo → Contrato → Locação ativa → Encerramento → Histórico

- **Veículos**: só o cadastro do bem (placa, modelo, cor, ano, chassi, km,
  status). Não tem mais locatário nem valores financeiros.
- **Contratos**: aqui nasce a relação com o locatário. Escolhe o veículo,
  escolhe sócios-x-fundo (`finance_model`), preenche dados do locatário
  (criados/atualizados em `tenants` via CPF), prazo em MESES (convertido pra
  semanas internamente, já que o pagamento é semanal), valores, caução, km
  inicial. Gera o contrato (Word e PDF) a partir do modelo real da empresa
  (`src/lib/contractDocumentContent.js` — 31 cláusulas, incluindo a 27ª sobre
  bateria/carregador, que é crítica pois a frota é 100% elétrica).
- **Locações (`rentals`)**: nascem automaticamente quando o contrato é
  marcado como assinado (`contractsService.signContract`). Isso também muda
  o veículo pra "Alugado". Não existe cadastro manual de locação.
- **Encerramento → Histórico**: IMPLEMENTADO (PR#2, PR#7). `EndLocationDialog.jsx`
  + `locationsService.js` fazem o encerramento (libera veículo, cancela
  cobranças futuras em `contract_charges`, mexe na caução). Páginas
  `Historico.jsx` e `Deposits.jsx` (Cauções) já existem e estão ligadas nas
  rotas — não são mais placeholder. Esta nota "AINDA NÃO IMPLEMENTADO" ficou
  desatualizada por várias sessões (ver "Lição crítica" abaixo) — **não
  confie neste arquivo sem confirmar com `git log` e o código real primeiro**.

## Decisões de negócio importantes

- **LOCADOR no contrato é sempre fixo**: Edson Amorim Barroso (mesmo que o
  PIX do pagamento vá pro Clei/Cleideilson Nogueira Santos).
- **`finance_model` (sócios × fundo) vive no CONTRATO**, não no veículo —
  pode mudar a cada novo locatário do mesmo carro (confirmado com o cliente).
- **A fila de rodízio Clei/Edson (`vehicles.next_destination`) vive no
  VEÍCULO**, não no contrato — é contínua ao longo da vida do carro,
  independente de troca de locatário.
- Contrato gerado em **Word (.docx)**, não só PDF — o cliente quer poder
  editar rapidinho se precisar corrigir algo (usa a lib `docx`, não
  `python-docx`, porque isso roda no navegador do usuário final, não no
  meu terminal).

## Estado real do banco de produção (Supabase, projeto "Dolphin Rent")

Isso é IMPORTANTE: o banco de produção tem tabelas que nunca estiveram em
nenhum arquivo de migração do repositório (produto de sessões anteriores
mexendo direto pela UI do Supabase). Confirme sempre com
`information_schema.columns` antes de assumir uma estrutura. Já encontramos:

- `rental_payments`: já existia, com o schema que `paymentsService.js`
  espera. Só faltava ligar a `rental_id`/`tenant_id` (adicionado).
- `locations` (tabela antiga, separada da nova `rentals`): tinha 2 locações
  reais (Julio Cesar / placa UIZ9D65 / R$1500-semana / início 10/06/2026, e
  Francinei Mendes Cruz / placa UJB9A51 / R$1500-semana / início 20/07/2026).
  Já migrados pra `tenants`+`contracts`+`rentals` — ver
  `supabase/migrations/004_v2_tenants_contracts_rentals.sql`.
- Existem tabelas de OUTRO projeto completamente misturadas no mesmo
  Supabase (`clients`, `cuts`, `profiles.barber_name` — parece um app de
  barbearia). Ignore-as, não são deste sistema.
- A migração 004_v2 já foi executada em produção (em 5 pedaços, por causa
  de um problema de colar SQL longo no editor do Supabase que corrompia o
  texto). Não precisa rodar de novo — é só o registro do que já existe.

## Lição CRÍTICA de 11/09/2026 — pasta local desatualizada, NÃO repetir

O cliente mudou de máquina e abriu uma sessão com uma pasta local
(`nb-prime-rent-final/nb-prime-rent-main`, fora de qualquer controle de
versão) que era uma cópia ESTÁTICA de 06/09 — de ANTES de 10 Pull Requests
já mergeados no GitHub (`cleilogx-cpu/nb-prime-rent`, branch `main`,
último commit 09/09) que implementaram: arquitetura V2 completa,
Encerramento→Histórico, Cauções (`Deposits.jsx`), cobranças
(`chargesService.js`), reconciliação do Dashboard, máscara de CPF, etc.

Uma sessão anterior trabalhou 1h+ nessa pasta desatualizada sem perceber,
porque: (1) a busca inicial por "encerramento" foi só por nome de arquivo
em português e não achou o componente em inglês (`EndContractDialog.jsx`,
que por acaso era um rascunho órfão mesmo, mas por sorte não pelo motivo
certo); (2) nunca foi feito `git log`/verificação de repositório remoto
antes de assumir que a pasta local era a fonte da verdade; (3) o cliente só
percebeu porque testou manualmente e notou "faltavam implementações".

**Resolução**: a pasta antiga foi renomeada pra
`nb-prime-rent-main-old-06set` (mantida só como backup, pode apagar depois
de confirmar que está tudo certo) e o código real foi clonado do GitHub
(`git clone https://github.com/cleilogx-cpu/nb-prime-rent.git`) pro lugar.
A partir de agora esta pasta É um clone git de verdade — use `git pull`
pra atualizar, nunca mais copie arquivos manualmente entre máquinas.

**Regra pra qualquer sessão futura**: antes de dizer que uma feature "não
existe" ou "não foi implementada", rode `git remote -v` e `git log --oneline -20`
(se for repo git) pra confirmar que não há trabalho mais recente em outro
lugar. Se a pasta não for um repo git, isso por si só é bandeira vermelha —
pergunte ao cliente se existe um GitHub/Codespaces com a versão real antes
de investigar a fundo ou implementar qualquer coisa "do zero".

## Lições de sessões anteriores

- `CREATE POLICY IF NOT EXISTS` não existe no Postgres — usar
  `DROP POLICY IF EXISTS` + `CREATE POLICY`.
- SQL muito longo (~250 linhas) colado de uma vez no SQL Editor do Supabase
  corrompeu o texto (apareceu um "create;" sozinho no meio). Prefira rodar
  migrações em pedaços de ~60-80 linhas quando for direto no editor web.

## Próximos passos pendentes

1. Confirmar visualmente (login real) que o fluxo completo funciona: criar
   veículo → criar contrato → baixar Word/PDF → assinar → Locações →
   Recebimentos → Encerrar locação → Histórico → Caução. `npm install` +
   `npm run build` + `npm run dev` já rodam limpos (confirmado 11/09).
2. `RenewContractDialog.jsx` e `ContractPreview.jsx` são código morto (não
   importados em lugar nenhum) e ainda usam o campo antigo `weekly_rent`
   em vez de `payment_amount`. Decidir com o cliente: implementar renovação
   de contrato de verdade usando esses arquivos como base, ou apagá-los.
3. Confirmar com o cliente se `rental_deposits`/`rental_deposit_transactions`
   (caução "v1", mais simples) ainda estão em uso ou se `contract_deposits`
   (caução "v2", ligada ao contrato, com devolução) os substituiu — as
   duas tabelas existem em produção.
