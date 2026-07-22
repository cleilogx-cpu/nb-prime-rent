# Fluxos de usuário da versão 1.0 — NB Prime Rent

## 1. Cadastrar veículo

Fluxo:
1. Usuário autenticado acessa a tela de veículos.
2. Preenche placa, marca, modelo, versão, ano, cor, quilometragem, valor semanal e modelo financeiro.
3. O sistema valida campos obrigatórios.
4. O veículo é salvo.
5. Um registro de auditoria é gerado.

## 2. Cadastrar locatário

Fluxo:
1. O usuário entra na área de locatários.
2. Preenche dados pessoais, contato, endereço e documentação.
3. O sistema valida CPF, telefone e e-mail.
4. O locatário é cadastrado como registro independente.
5. O histórico de locações passa a referenciar esse locatário.

## 3. Iniciar locação

Fluxo:
1. O usuário seleciona um veículo disponível e um locatário cadastrado.
2. Preenche dados da locação: período, valor semanal, caução, periodicidade e condições.
3. O sistema cria uma locação ativa vinculada ao veículo e ao locatário.
4. O status do veículo é atualizado para locado.
5. O contrato pode ser gerado automaticamente.

## 4. Registrar recebimento no modelo partners

Fluxo:
1. O usuário seleciona a locação e o período da cobrança.
2. Define valor previsto, valor recebido, método e data recebida.
3. O sistema registra o recebimento com destino financeiro e beneficiário.
4. O sistema sugere automaticamente o próximo sócio com base no histórico.
5. A auditoria registra o lançamento e o destino.

## 5. Registrar recebimento no modelo savings

Fluxo:
1. O usuário cria um recebimento associado à locação.
2. O sistema define o destino como fundo do veículo.
3. O valor entra como movimentação do fundo.
4. O saldo é recalculado por movimentações.
5. O lançamento é auditado.

## 6. Realizar saque mensal do fundo

Fluxo:
1. O sistema identifica o início do mês.
2. O usuário seleciona uma obrigação ou finalidade.
3. Define valor, data e responsável.
4. O sistema cria uma movimentação de saque.
5. O saldo restante é recalculado e exibido.
6. A auditoria registra a operação.

## 7. Registrar despesa

Fluxo:
1. O usuário acessa despesas.
2. Seleciona veículo e locação, quando aplicável.
3. Define categoria, descrição, valor, método, data e origem do recurso.
4. O sistema salva a despesa e atualiza o painel financeiro.
5. A auditoria registra a operação.

## 8. Movimentar caução

Fluxo:
1. O usuário acessa a caução da locação.
2. Escolhe o tipo de movimento: recebimento, complemento, abatimento, devolução ou ajuste.
3. Preenche valor, descrição e data.
4. O sistema recalcula saldo, pendências e valores devolvidos.
5. A operação é auditada.

## 9. Gerar contrato

Fluxo:
1. O usuário seleciona uma locação ativa.
2. O sistema preenche dados do locatário, veículo e locação em um modelo.
3. O contrato é gerado em PDF.
4. O arquivo é salvo no storage.
5. A versão gerada fica vinculada ao registro de contrato.

## 10. Renovar contrato

Fluxo:
1. O usuário seleciona um contrato vigente próximo do término.
2. O sistema cria uma nova versão ou renovação.
3. Atualiza data de término e status.
4. O contrato anterior é preservado para histórico.

## 11. Encerrar locação

Fluxo:
1. O usuário marca a locação como encerramento solicitado ou concluído.
2. O sistema fecha o vínculo ativo com o veículo.
3. O status do veículo é atualizado.
4. As pendências financeiras e de caução são avaliadas.
5. O encerramento é auditado.

## 12. Substituir locatário

Fluxo:
1. O sistema identifica uma troca de locatário para o mesmo veículo.
2. O usuário cria uma nova locação associada ao novo locatário.
3. A locação antiga é encerrada ou mantida como histórica.
4. O novo vínculo passa a ser o ativo.

## 13. Cancelar lançamento financeiro

Fluxo:
1. O usuário marca um lançamento financeiro como cancelado.
2. O sistema registra o motivo e o usuário responsável.
3. O estado anterior é preservado em auditoria.
4. O lançamento deixa de aparecer como ativo, mas permanece no histórico.
