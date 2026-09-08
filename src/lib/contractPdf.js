import { jsPDF } from 'jspdf'
import { buildContractSections } from './contractDocumentContent.js'

const PAGE_WIDTH = 210
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const PAGE_HEIGHT = 297
const BOTTOM_LIMIT = PAGE_HEIGHT - 20

/**
 * Renderiza as seções em um PDF (jsPDF), com quebra de página automática.
 * Retorna o objeto jsPDF pronto — quem chamar decide se salva, baixa ou
 * gera um blob/URL pra anexar em outro lugar.
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
        ensureSpace(9)
        y += 2
        writeLines([section.text], { size: 12, style: 'bold', gap: 7 })
        break
      case 'paragraph':
        writeLines(doc.splitTextToSize(section.text, CONTENT_WIDTH), { size: 10, style: 'normal', gap: 5 })
        y += 1
        break
      case 'list':
        section.items.forEach((item, index) => {
          const prefix = section.ordered ? `${index + 1}. ` : '• '
          const wrapped = doc.splitTextToSize(`${prefix}${item}`, CONTENT_WIDTH - 4)
          writeLines(wrapped, { size: 10, style: 'normal', gap: 5 })
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
