# NB Prime Rent — contexto do projeto (handoff de sessão anterior no chat)

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
- **Encerramento → Histórico**: AINDA NÃO IMPLEMENTADO. Falta o formulário
  curto (data real de encerramento, km final, avaliação Boa/Ruim, observação)
  que muda a locação pra "Encerrada", libera o veículo, e faz o contrato
  aparecer no Histórico (que hoje é só uma página placeholder).

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

## Lições da sessão anterior (evitar repetir)

- Transferir arquivos pro Codespaces por arrastar-e-soltar é pouco confiável
  pra pastas grandes — vários arquivos ficaram desatualizados silenciosamente
  (`package.json`, migrations, `VehicleForm.jsx`, `dashboardService.js`).
  Se for usar Codespaces de novo, prefira `git pull`/`git clone` a
  arrastar arquivos manualmente.
- `CREATE POLICY IF NOT EXISTS` não existe no Postgres — usar
  `DROP POLICY IF EXISTS` + `CREATE POLICY`.
- SQL muito longo (~250 linhas) colado de uma vez no SQL Editor do Supabase
  corrompeu o texto (apareceu um "create;" sozinho no meio). Prefira rodar
  migrações em pedaços de ~60-80 linhas quando for direto no editor web.

## Próximos passos pendentes

1. Confirmar que `npm install && npm run dev` roda limpo localmente com
   este código (nunca foi testado localmente até agora, só em Codespaces
   com problemas de sincronização de arquivo).
2. Testar o fluxo completo: criar veículo → criar contrato → baixar
   Word/PDF → marcar como assinado → ver locação aparecer em Locações →
   registrar recebimento em Pagamentos.
3. Implementar Encerramento (formulário curto) → Histórico automático
   (última fase do desenho original).
4. Point de atenção não resolvido: o Dashboard soma valores da tabela
   antiga `payments`, enquanto a tela de Pagamentos usa `rental_payments`
   — os números provavelmente não batem. Vale reconciliar quando mexer
   no Dashboard.
