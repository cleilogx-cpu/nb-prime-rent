import { jsPDF } from 'jspdf'
import { buildContractSections } from './contractDocumentContent.js'

const PAGE_WIDTH = 210
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const PAGE_HEIGHT = 297
const BOTTOM_LIMIT = PAGE_HEIGHT - 20

/**
 * Desenha uma linha (já sem quebra -- vem de splitTextToSize) distribuindo o
 * espaço extra entre as palavras pra ocupar toda `maxWidth`, imitando a
 * justificação do .docx (AlignmentType.JUSTIFIED). Uma linha com uma palavra
 * só (ou já do tamanho da largura) não tem onde distribuir espaço -- desenha
 * normal. Quem chama decide não usar isto na última linha do parágrafo (regra
 * tipográfica padrão: a última linha de um parágrafo justificado não estica).
 */
function drawJustifiedLine(doc, line, x, y, maxWidth) {
  const words = line.trim().split(/\s+/)

  if (words.length <= 1) {
    doc.text(line, x, y)
    return
  }

  const spaceWidth = doc.getTextWidth(' ')
  const wordsWidth = words.reduce((total, word) => total + doc.getTextWidth(word), 0)
  const naturalWidth = wordsWidth + spaceWidth * (words.length - 1)
  const extraPerGap = Math.max(0, (maxWidth - naturalWidth) / (words.length - 1))

  let cursorX = x
  words.forEach((word) => {
    doc.text(word, cursorX, y)
    cursorX += doc.getTextWidth(word) + spaceWidth + extraPerGap
  })
}

/**
 * Renderiza as seções em um PDF (jsPDF), com quebra de página automática,
 * rodapé com numeração de página e listas com recuo de verdade (a
 * continuação de um item longo alinha embaixo do texto, não do número/•).
 * Retorna o objeto jsPDF pronto — quem chamar decide se salva, baixa ou
 * gera um blob/URL pra anexar em outro lugar.
 *
 * Corpo das cláusulas ('paragraph') é justificado via drawJustifiedLine
 * (margem esquerda alinhada, direita alinhada pela distribuição de espaços)
 * pra ficar igual ao .docx. Títulos ('heading'/'subheading') continuam
 * esquerda+negrito e listas continuam esquerda+recuo -- só o corpo corrido
 * da cláusula muda. A quebra de linha/página não muda em nada (mesmo
 * splitTextToSize, mesmo ensureSpace por linha): só a forma de desenhar cada
 * linha já quebrada é diferente, então a paginação existente é preservada.
 */
export function renderContractPdf(sections) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = MARGIN

  function ensureSpace(lines) {
    if (y + lines > BOTTOM_LIMIT) {
      doc.addPage()
      y = MARGIN
    }
  }

  function writeLines(lines, { size = 10, style = 'normal', gap = 5, align = 'left' } = {}) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    lines.forEach((line) => {
      ensureSpace(gap)
      const x = align === 'center' ? PAGE_WIDTH / 2 : MARGIN
      doc.text(line, x, y, { align })
      y += gap
    })
  }

  sections.forEach((section) => {
    switch (section.type) {
      case 'kicker':
        writeLines([section.text], { size: 9, style: 'normal', gap: 5, align: 'center' })
        break
      case 'title': {
        const lines = section.text.split('\n')
        writeLines(lines, { size: 16, style: 'bold', gap: 7, align: 'center' })
        y += 2
        break
      }
      case 'subtitle':
        writeLines(doc.splitTextToSize(section.text, CONTENT_WIDTH), { size: 10, style: 'italic', gap: 5, align: 'center' })
        break
      case 'date':
        writeLines([section.text], { size: 9, style: 'normal', gap: 8, align: 'center' })
        break
      case 'heading':
        ensureSpace(10)
        y += 3
        writeLines([section.text], { size: 14, style: 'bold', gap: 8 })
        y += 1
        break
      case 'subheading':
        // Reserva espaço extra (não só o da própria linha do título) pra
        // evitar título de seção sozinho no fim da página, com a cláusula
        // inteira jogada pra próxima -- reserva o suficiente pro título +
        // ao menos a primeira linha do parágrafo que sempre vem depois dele.
        ensureSpace(9 + 6)
        y += 2
        writeLines([section.text], { size: 12, style: 'bold', gap: 7 })
        break
      case 'paragraph': {
        const lines = doc.splitTextToSize(section.text, CONTENT_WIDTH)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        lines.forEach((line, index) => {
          ensureSpace(5)
          if (index === lines.length - 1) {
            doc.text(line, MARGIN, y)
          } else {
            drawJustifiedLine(doc, line, MARGIN, y, CONTENT_WIDTH)
          }
          y += 5
        })
        y += 1
        break
      }
      case 'list':
        section.items.forEach((item, index) => {
          const prefix = section.ordered ? `${index + 1}. ` : '• '
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10)
          const indent = (doc.getStringUnitWidth(prefix) * 10) / doc.internal.scaleFactor + 1
          const wrapped = doc.splitTextToSize(item, CONTENT_WIDTH - indent)

          ensureSpace(5)
          doc.text(prefix, MARGIN, y)
          doc.text(wrapped[0] || '', MARGIN + indent, y)
          y += 5

          for (let lineIndex = 1; lineIndex < wrapped.length; lineIndex += 1) {
            ensureSpace(5)
            doc.text(wrapped[lineIndex], MARGIN + indent, y)
            y += 5
          }
        })
        y += 1
        break
      case 'signature':
        ensureSpace(30)
        y += 10
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.line(MARGIN, y, MARGIN + 70, y)
        doc.line(MARGIN + 90, y, MARGIN + 160, y)
        y += 5
        doc.text(section.locador, MARGIN, y)
        doc.text(section.locatario, MARGIN + 90, y)
        y += 5
        doc.text('LOCADOR', MARGIN, y)
        doc.text('LOCATÁRIO', MARGIN + 90, y)
        y += 15
        break
      case 'closing':
        ensureSpace(10)
        writeLines([section.text], { size: 10, style: 'normal', gap: 6, align: 'center' })
        break
      default:
        break
    }
  })

  // Rodapé com numeração de página -- só dá pra saber o total de páginas
  // depois que todo o conteúdo já foi desenhado.
  const totalPages = doc.internal.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(140)
    doc.text(`Página ${page} de ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' })
    doc.setTextColor(0)
  }

  return doc
}

/**
 * Gera o PDF do contrato e devolve um Blob, pronto pra baixar ou anexar
 * (ex: subir pro Supabase Storage como o documento assinado).
 */
export function generateContractPdfBlob(contract) {
  const sections = buildContractSections(contract)
  const doc = renderContractPdf(sections)
  return doc.output('blob')
}

/**
 * Gera e já dispara o download no navegador.
 */
export function downloadContractPdf(contract) {
  const sections = buildContractSections(contract)
  const doc = renderContractPdf(sections)
  const fileName = `${contract.contract_number || 'contrato'}.pdf`
  doc.save(fileName)
}
