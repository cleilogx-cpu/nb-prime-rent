import { generatePaymentSchedule } from './contractLogic.js'
import { formatCurrency, formatDate, formatTenantAddress } from './format.js'
import { PERIODICITY } from './constants.js'

// Dados fixos da locadora (empresa). O LOCADOR que assina é sempre o mesmo,
// independente do tipo de pagamento (sócios/fundo) escolhido no contrato.
export const LOCADOR = {
  nome: 'EDSON AMORIM BARROSO',
  cpf: '928.156.502-15',
  endereco: 'Rua João Paulo I, 2400, Novo Horizonte, na Cidade de Porto Velho-RO',
}

// Dados bancários fixos usados em todos os contratos.
const PIX = {
  chave: 'clei1982@gmail.com',
  agencia: '0001',
  conta: '693768-2',
  banco: 'Nu Pagamento S.A',
  titular: 'Cleideilson Nogueira Santos',
}

const FRANQUIA_SEGURO = 8845

// Texto usado nas cláusulas 3ª/4ª conforme a periodicidade escolhida no
// contrato. "weekly" preserva exatamente o texto que já existia (era a
// única periodicidade suportada antes desta refatoração).
const PERIODICITY_TEXT = {
  [PERIODICITY.DAILY]: { unit: 'dia', cadence: 'todo dia' },
  [PERIODICITY.WEEKLY]: { unit: 'semana', cadence: 'toda semana' },
  [PERIODICITY.BIWEEKLY]: { unit: 'quinzena', cadence: 'a cada quinzena' },
  [PERIODICITY.MONTHLY]: { unit: 'mês', cadence: 'todo mês' },
}

function numeroPorExtenso(n) {
  const nomes = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
    'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte']
  return nomes[n] ?? String(n)
}

/**
 * Monta o texto de todas as cláusulas com os dados reais do contrato já
 * substituídos. Segue a estrutura do modelo em papel usado pela empresa.
 */
export function buildContractSections(contract) {
  const tenant = contract.tenants || {}
  const vehicle = contract.vehicles || {}
  const weeks = contract.weeks || 0
  const periodicity = contract.periodicity || PERIODICITY.WEEKLY
  const periodicityText = PERIODICITY_TEXT[periodicity] || PERIODICITY_TEXT[PERIODICITY.WEEKLY]
  const paymentAmount = Number(contract.payment_amount || 0)
  const deposit = Number(contract.deposit_amount || 0)
  const schedule = generatePaymentSchedule(contract.start_date, contract.end_date, periodicity, paymentAmount)

  const sections = []

  sections.push({ type: 'kicker', text: 'LOCAÇÃO DE VEÍCULOS' })
  sections.push({ type: 'title', text: 'CONTRATO DE LOCAÇÃO DE VEÍCULO PARA\nTRANSPORTE POR APLICATIVO' })
  sections.push({ type: 'subtitle', text: `Instrumento Particular de Locação de Veículo ${vehicle.model || ''}` })
  sections.push({ type: 'date', text: formatDate(contract.start_date) })

  sections.push({ type: 'heading', text: 'CONTRATO DE LOCAÇÃO DE VEÍCULO' })

  sections.push({ type: 'subheading', text: '1. DAS PARTES' })
  sections.push({
    type: 'paragraph',
    text: `LOCADOR: ${LOCADOR.nome}, CPF nº ${LOCADOR.cpf}, Endereço ${LOCADOR.endereco}.`,
  })
  sections.push({
    type: 'paragraph',
    text: `LOCATÁRIO: ${(tenant.full_name || 'NÃO INFORMADO').toUpperCase()}, CPF nº ${tenant.cpf || 'não informado'}, Endereço ${formatTenantAddress(tenant)}.`,
  })

  sections.push({ type: 'subheading', text: '2. DO OBJETO' })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 1ª — O objeto do presente contrato é a locação do veículo de propriedade do LOCADOR, abaixo descrito, para uso exclusivo do LOCATÁRIO na atividade de transporte remunerado de passageiros via plataformas digitais (Uber, 99 e similares):',
  })
  sections.push({
    type: 'list',
    items: [
      `Marca/Modelo: ${vehicle.model || 'não informado'}.`,
      `Ano/Modelo: ${vehicle.year || 'não informado'}`,
      `Placa: ${vehicle.plate || 'não informada'}`,
      `Chassi: ${vehicle.chassis || 'não informado'}`,
      `Cor: ${vehicle.color || 'não informada'}`,
    ],
  })

  sections.push({ type: 'subheading', text: '3. DO PRAZO E VIGÊNCIA' })
  sections.push({
    type: 'paragraph',
    text: `CLÁUSULA 2ª — O presente contrato terá vigência de ${weeks} (${numeroPorExtenso(weeks)}) semanas, contando como primeiro dia ${formatDate(contract.start_date)} e último dia ${formatDate(contract.end_date)}, podendo ser renovado automaticamente por iguais períodos, desde que não haja manifestação em contrário de qualquer das partes.`,
  })

  sections.push({ type: 'subheading', text: '4. DOS VALORES E FORMA DE PAGAMENTO' })
  sections.push({
    type: 'paragraph',
    text: periodicity === PERIODICITY.WEEKLY
      ? `CLÁUSULA 3ª — O valor da locação é de ${formatCurrency(paymentAmount / 7)} por dia, totalizando ${formatCurrency(paymentAmount)} a ser pago semanalmente, conforme cronograma abaixo:`
      : `CLÁUSULA 3ª — O valor da locação é de ${formatCurrency(paymentAmount)} por ${periodicityText.unit}, conforme cronograma abaixo:`,
  })
  sections.push({
    type: 'list',
    items: schedule.map((item) => `${item.label}: Pagamento no dia ${formatDate(item.due_date)}${item.week === 1 ? ' (ato da assinatura deste contrato)' : ''};`),
  })
  sections.push({
    type: 'paragraph',
    text: `CLÁUSULA 4ª — O pagamento deverá ser realizado ${periodicityText.cadence}, conforme cronograma, via PIX na chave ${PIX.chave}, Ag ${PIX.agencia}, Conta ${PIX.conta}, ${PIX.banco}, em nome de ${PIX.titular}.`,
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 5ª — O atraso no pagamento implicará em multa de 10% sobre o valor devido, acrescido de juros de mora de 1% ao mês e poderá ensejar a rescisão imediata do contrato com o bloqueio remoto do veículo assim que estiver parado.',
  })

  sections.push({ type: 'subheading', text: '5. DO DEPÓSITO CAUÇÃO' })
  sections.push({
    type: 'paragraph',
    text: `CLÁUSULA 6ª — No ato da assinatura, o LOCATÁRIO depositará a quantia de ${formatCurrency(deposit)} a título de caução, para garantia de eventuais danos ao veículo, multas de trânsito ou inadimplência contratual, conforme combinado entre as partes.`,
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 7ª — O valor da caução será restituído ao LOCATÁRIO em até 5 (cinco) dias úteis após a devolução do veículo, descontados eventuais valores devidos ou danos constatados na vistoria final.',
  })

  sections.push({ type: 'subheading', text: '6. DAS RESPONSABILIDADES' })
  sections.push({ type: 'paragraph', text: 'CLÁUSULA 8ª — Compete ao LOCATÁRIO:' })
  sections.push({
    type: 'list',
    ordered: true,
    items: [
      'Arcar com os custos de higienização e limpeza do veículo;',
      'Realizar a manutenção preventiva básica, incluindo a calibração e substituição de pneus e avarias decorrentes da má condução;',
      'Efetuar o pagamento integral de todas as multas de trânsito ocorridas durante o período de posse do veículo;',
      'Zelar pela integridade da bateria e componentes elétricos, seguindo as orientações do fabricante, quando aplicável;',
      'Possuir garagem com barreira física e segurança para guardar o veículo nos momentos de descanso ou não uso.',
    ],
  })
  sections.push({ type: 'paragraph', text: 'CLÁUSULA 9ª — Compete ao LOCADOR:' })
  sections.push({
    type: 'list',
    ordered: true,
    items: [
      'Arcar com a manutenção mecânica pesada e revisões periódicas de fábrica;',
      'Manter o seguro total do veículo ativo;',
      'Arcar com os custos de IPVA, Licenciamento e DPVAT;',
      'Disponibilizar o veículo em perfeitas condições de uso e segurança.',
    ],
  })

  sections.push({ type: 'subheading', text: '7. DA FRANQUIA DO SEGURO E RESPONSABILIDADE EM SINISTRO' })
  sections.push({
    type: 'paragraph',
    text: `CLÁUSULA 10ª — Em caso de sinistro (colisão, roubo, furto, incêndio ou danos a terceiros) envolvendo o veículo locado, o LOCATÁRIO obriga-se a arcar integralmente com o valor de ${formatCurrency(FRANQUIA_SEGURO)} referente à franquia do seguro, conforme estipulado na apólice vigente, independentemente de culpa pela ocorrência do evento.`,
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 11ª — O valor da franquia deverá ser pago pelo LOCATÁRIO no prazo máximo de 48 (quarenta e oito) horas contadas da comunicação do sinistro, sob pena de incidência de multa de 10% e juros de mora de 1% ao mês.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 12ª — Caso a seguradora se recuse a cobrir o sinistro por qualquer motivo atribuível ao LOCATÁRIO (ex.: uso em desacordo com o contrato, direção sob efeito de álcool, não comunicação em até 24h), todos os custos de reparo do veículo correrão por conta exclusiva do LOCATÁRIO.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 13ª — Nos períodos em que o veículo estiver indisponível para locação em decorrência de sinistro consertado ou em conserto, o LOCATÁRIO permanecerá responsável pelo pagamento das diárias conforme cláusula específica de carro reserva.',
  })

  sections.push({ type: 'subheading', text: '8. DO CARRO RESERVA EM CASO DE INDISPONIBILIDADE DO VEÍCULO' })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 14ª — Nas hipóteses em que o veículo objeto deste contrato ficar indisponível para uso por período superior a 3 (três) dias consecutivos em razão de: colisão ou sinistro coberto pelo seguro, manutenção mecânica corretiva de responsabilidade do LOCADOR, revisão periódica obrigatória ou qualquer outro motivo que não seja causado exclusivamente por dolo ou culpa do locatário, o LOCADOR disponibilizará ao LOCATÁRIO um veículo reserva de categoria similar, no prazo máximo de 48 (quarenta e oito) horas contadas da comunicação formal da indisponibilidade.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 15ª — O veículo reserva será disponibilizado pelo prazo máximo de 15 (quinze) dias corridos, salvo acordo diverso entre as partes.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 16ª — O LOCATÁRIO arcará com os custos de combustível/recarga do veículo reserva, sendo o valor da diária da locação mantido nos mesmos termos deste contrato durante o período de uso do carro reserva, salvo acordo entre as partes.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 17ª — Fica excluída a obrigação do LOCADOR de fornecer carro reserva nas seguintes hipóteses: indisponibilidade decorrente de ato doloso ou culposo grave do LOCATÁRIO (embriaguez ao volante, direção sem CNH, participação em racha etc.), apreensão do veículo por autoridade pública por ato imputável ao LOCATÁRIO e inadimplência do LOCATÁRIO no momento do sinistro.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 18ª — Durante o período de indisponibilidade do veículo, o valor do aluguel permanece devido pelo LOCATÁRIO, substituindo-se a obrigação de entrega do veículo original pelo fornecimento do carro reserva, salvo nas hipóteses de exclusão previstas na cláusula 17ª, hipótese em que o LOCATÁRIO arcará com as diárias normalmente mesmo sem o uso de qualquer veículo.',
  })

  sections.push({ type: 'subheading', text: '9. DO PRAZO PARA REPARAÇÃO DE PEQUENAS AVARIAS' })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 19ª — Consideram-se pequenas avarias para os fins desta cláusula: arranhões na pintura que não atinjam a chapa metálica, pequenos amassados sem dano estrutural, danos estéticos em retrovisores, para-choques ou lanternas que não comprometam a funcionalidade.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 20ª — Constatada qualquer pequena avaria no veículo, o LOCATÁRIO obriga-se a realizar o reparo por conta própria no prazo máximo de 15 (quinze) dias corridos, contados da data da notificação pelo LOCADOR ou da data do evento, o que ocorrer primeiro, considerando como comunicação qualquer mensagem via aplicativos de whatsapp ou similar.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 21ª — O reparo deverá ser realizado em oficina de livre escolha do LOCATÁRIO, desde que técnica e comercialmente habilitada, e o serviço deverá ser compatível com os padrões estéticos e de qualidade do veículo.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 22ª — Findo o prazo sem a devida reparação, o LOCADOR poderá realizar o serviço diretamente e cobrar do LOCATÁRIO o valor integral do reparo, acrescido de multa de 20% sobre o valor do serviço e juros de mora de 1% ao mês.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 23ª — O descumprimento reiterado do prazo de reparação (2 ou mais ocorrências) constitui infração contratual grave e autoriza a rescisão imediata do contrato pelo LOCADOR, nos termos da Cláusula 28ª.',
  })

  sections.push({ type: 'subheading', text: '10. REGRAS DE USO E RESTRIÇÕES' })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 24ª — O veículo é de uso exclusivo do LOCATÁRIO devidamente identificado neste contrato, sendo expressamente PROIBIDA A SUBLOCAÇÃO ou o empréstimo do veículo a terceiros, sob pena de rescisão imediata e perda da caução.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 25ª — É terminantemente proibido fumar no interior do veículo. O descumprimento acarretará multa correspondente a uma taxa de higienização profunda de R$ 500,00.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 26ª — As vistorias no veículo serão realizadas semanalmente, em dia, horário e local a serem alinhados entre as partes com pelo menos 48 (quarenta e oito) horas de antecedência. De preferência no dia do pagamento semanal.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 27ª — O LOCATÁRIO compromete-se a não permitir descarga recorrente abaixo de 10% da bateria, bem como utilizar carregadores compatíveis com as especificações do fabricante.',
  })

  sections.push({ type: 'subheading', text: '11. DA RESCISÃO' })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 28ª — Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio por escrito (via WhatsApp ou e-mail) com antecedência mínima de 7 (sete) dias.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 29ª — A rescisão imediata ocorrerá em caso de: (a) inadimplência igual ou superior a 48 horas; (b) uso indevido ou negligente do veículo; (c) apreensão do veículo por autoridades em decorrência de atos do LOCATÁRIO; (d) descumprimento de qualquer das cláusulas deste contrato; (e) atos que atentem contra a fé pública dos contratos e atos normativos e a moralidade pública.',
  })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 30ª — Em fatos que levarem à rescisão do contrato, o LOCATÁRIO devolverá o veículo imediatamente, sob pena de responder civil e penalmente pelos atos praticados, podendo o LOCADOR realizar o bloqueio do veículo.',
  })

  sections.push({ type: 'subheading', text: '12. DO FORO' })
  sections.push({
    type: 'paragraph',
    text: 'CLÁUSULA 31ª — As partes elegem o Foro da Comarca de Porto Velho, RO, para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.',
  })
  sections.push({
    type: 'paragraph',
    text: 'E, por estarem assim justos e contratados, firmam o presente instrumento em 02 (duas) vias de igual teor e forma.',
  })

  sections.push({
    type: 'signature',
    locador: LOCADOR.nome,
    locatario: (tenant.full_name || 'NÃO INFORMADO').toUpperCase(),
  })

  sections.push({ type: 'closing', text: `Local e data: Porto Velho, RO, ${formatDate(contract.start_date)}` })

  return sections
}

