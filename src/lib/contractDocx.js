import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { buildContractSections } from './contractDocumentContent.js'

// ~2cm de margem em twips (1cm = 566.9 twips) -- antes o docx usava a margem
// padrão (bem mais larga de um lado), deixando o texto desalinhado com o
// aspecto de um contrato "de verdade".
const PAGE_MARGIN = 1134

const ORDERED_LIST_REFERENCE = 'contract-ordered-list'

const NUMBERING_CONFIG = {
  config: [
    {
      reference: ORDERED_LIST_REFERENCE,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 420, hanging: 260 } } },
        },
      ],
    },
  ],
}

function textParagraph(text, { bold = false, italic = false, size = 20, align = AlignmentType.LEFT, spacingAfter = 160, keepNext = false } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter },
    keepLines: keepNext,
    keepNext,
    children: [new TextRun({ text, bold, italics: italic, size })],
  })
}

function signatureLineCell(name, label) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
        spacing: { after: 80 },
        children: [new TextRun({ text: ' ' })],
      }),
      textParagraph(name, { size: 20, spacingAfter: 40 }),
      textParagraph(label, { size: 18, spacingAfter: 0 }),
    ],
  })
}

/**
 * Converte as seções do contrato (o mesmo conteúdo usado no PDF) em um
 * documento Word editável. Quem gerar isso pode abrir no Word ou no Google
 * Docs e corrigir qualquer coisa na hora, sem precisar mexer no sistema.
 */
export function buildContractDocx(contract) {
  const sections = buildContractSections(contract)
  const children = []

  sections.forEach((section) => {
    switch (section.type) {
      case 'kicker':
        children.push(textParagraph(section.text, { size: 18, align: AlignmentType.CENTER, spacingAfter: 100 }))
        break
      case 'title':
        section.text.split('\n').forEach((line) => {
          children.push(
            new Paragraph({
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 80 },
              children: [new TextRun({ text: line, bold: true, size: 32 })],
            }),
          )
        })
        break
      case 'subtitle':
        children.push(textParagraph(section.text, { italic: true, size: 20, align: AlignmentType.CENTER, spacingAfter: 100 }))
        break
      case 'date':
        children.push(textParagraph(section.text, { size: 18, align: AlignmentType.CENTER, spacingAfter: 200 }))
        break
      case 'heading':
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 160 },
            children: [new TextRun({ text: section.text, bold: true, size: 28 })],
          }),
        )
        break
      case 'subheading':
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 160, after: 120 },
            children: [new TextRun({ text: section.text, bold: true, size: 24 })],
          }),
        )
        break
      case 'paragraph':
        children.push(textParagraph(section.text, { size: 20, align: AlignmentType.JUSTIFIED }))
        break
      case 'list':
        section.items.forEach((item) => {
          if (section.ordered) {
            children.push(
              new Paragraph({
                numbering: { reference: ORDERED_LIST_REFERENCE, level: 0 },
                spacing: { after: 80 },
                children: [new TextRun({ text: item, size: 20 })],
              }),
            )
          } else {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 80 },
                children: [new TextRun({ text: item, size: 20 })],
              }),
            )
          }
        })
        break
      case 'signature':
        // `keepNext`/`keepLines` no parágrafo anterior + `cantSplit` na linha
        // da tabela evitam que "LOCADOR"/"LOCATÁRIO" fique separado da linha
        // de assinatura por uma quebra de página no meio.
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            rows: [
              new TableRow({
                cantSplit: true,
                children: [
                  signatureLineCell(section.locador, 'LOCADOR'),
                  signatureLineCell(section.locatario, 'LOCATÁRIO'),
                ],
              }),
            ],
          }),
        )
        children.push(textParagraph(' ', { size: 20 }))
        break
      case 'closing':
        children.push(textParagraph(section.text, { size: 20, align: AlignmentType.CENTER, spacingAfter: 100 }))
        break
      default:
        break
    }
  })

  return new Document({
    numbering: NUMBERING_CONFIG,
    sections: [
      {
        properties: {
          page: {
            margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: 'NB Prime Rent — Contrato de Locação', size: 14, color: '888888' })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ', size: 14, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '888888' }),
                  new TextRun({ text: ' de ', size: 14, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}

/**
 * Gera o .docx e devolve um Blob — pronto pra baixar ou anexar (ex: subir
 * pro Supabase Storage como rascunho antes da assinatura).
 */
export async function generateContractDocxBlob(contract) {
  const doc = buildContractDocx(contract)
  return Packer.toBlob(doc)
}

/**
 * Gera e já dispara o download do .docx no navegador.
 */
export async function downloadContractDocx(contract) {
  const blob = await generateContractDocxBlob(contract)
  const fileName = `${contract.contract_number || 'contrato'}.docx`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
