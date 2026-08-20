// Dependency-free PDF report renderer (Phase 6.1, ADR 033). Emits a minimal
// single-encoding (WinAnsi/Latin-1) PDF 1.4: A4 pages, Helvetica + Helvetica-Bold,
// header bars, left/right-aligned cells and page footers. No runtime dependency —
// the binary is hand-assembled with a valid cross-reference table so it opens in
// any reader. Arabic and other non-Latin glyphs degrade to '?'; diacritics used by
// the clinic's French working language are covered by the cp1252 table.
import type { ReportDocument } from './reportMath'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 40
const CONTENT_BOTTOM = PAGE_HEIGHT - MARGIN
const ROW_HEIGHT = 15
const HEADER_HEIGHT = 16

// cp1252 (Windows-1252) code points for glyphs outside plain ASCII. `œ`/`Œ` etc.
// are included because the generated documents are French.
const CP1252: Readonly<Record<string, number>> = {
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '–': 0x96,
  '—': 0x97,
  '…': 0x85,
  '«': 0xab,
  '»': 0xbb,
  '€': 0x80,
  '°': 0xb0,
  '±': 0xb1,
  '·': 0xb7,
  À: 0xc0,
  Â: 0xc2,
  Ä: 0xc4,
  Ç: 0xc7,
  È: 0xc8,
  É: 0xc9,
  Ê: 0xca,
  Ë: 0xcb,
  Ì: 0xcc,
  Î: 0xce,
  Ï: 0xcf,
  Ò: 0xd2,
  Ô: 0xd4,
  Ö: 0xd6,
  Ù: 0xd9,
  Û: 0xdb,
  Ü: 0xdc,
  à: 0xe0,
  â: 0xe2,
  ä: 0xe4,
  ç: 0xe7,
  è: 0xe8,
  é: 0xe9,
  ê: 0xea,
  ë: 0xeb,
  ì: 0xec,
  î: 0xee,
  ï: 0xef,
  ô: 0xf4,
  ö: 0xf6,
  ù: 0xf9,
  û: 0xfb,
  ü: 0xfc,
  Œ: 0x8c,
  œ: 0x9c,
}

// Encode a UI string into WinAnsi; unknown glyphs become '?'.
export function encodePdfText(input: string): string {
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0)
    if (code === undefined) continue
    if (code <= 0x7f) {
      out += ch
    } else if (code <= 0xff) {
      out += ch
    } else {
      out += String.fromCharCode(CP1252[ch] ?? 0x3f)
    }
  }
  return out
}

// PDF string literal: escape backslash + parentheses, then WinAnsi-encode.
export function escapePdfString(input: string): string {
  return encodePdfText(input).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

type Font = 'F1' | 'F2' // regular / bold
type Align = 'left' | 'right'

interface Lay {
  x: number
  yTop: number
  w: number
  h: number
  fill?: string
  text?: string
  font?: Font
  size?: number
  align?: Align
}

interface Page {
  lays: Lay[]
}

function columnWidth(headers: readonly string[]): number {
  return (PAGE_WIDTH - 2 * MARGIN) / Math.max(headers.length, 1)
}

// A column is numeric when every non-empty cell parses as a (possibly signed)
// number — money, counts and percentages become right-aligned tables.
function isNumericColumn(cells: readonly (readonly string[])[]): boolean {
  const seen = new Set<string>()
  for (const row of cells) {
    for (const cell of row) {
      const trimmed = cell.trim()
      if (trimmed !== '' && !seen.has(trimmed)) seen.add(trimmed)
    }
  }
  if (seen.size === 0) return true
  return [...seen].every((c) => /^-?\d[\d\s]*(?:[,.]\d+)?$/.test(c))
}

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, Math.max(maxChars - 1, 0)) + '…' : text
}

// Approximate Helvetica advance (~0.52em average per glyph) for right alignment.
function textWidthPx(text: string, sizePx: number): number {
  return encodePdfText(text).length * sizePx * 0.52
}

function layoutPages(doc: ReportDocument): Page[] {
  const pages: Page[] = [{ lays: [] }]
  const curPage = () => pages[pages.length - 1]
  let cur = 48 + 22 // title height consumed on the first page

  const push = (lay: Lay): void => {
    curPage().lays.push(lay)
  }

  const pushTitleBlock = (): void => {
    push({
      x: MARGIN,
      yTop: 30,
      w: PAGE_WIDTH - 2 * MARGIN,
      h: 24,
      text: doc.title,
      font: 'F2',
      size: 18,
      align: 'left',
    })
    push({
      x: MARGIN,
      yTop: 58,
      w: PAGE_WIDTH - 2 * MARGIN,
      h: 12,
      text: doc.subtitle,
      font: 'F1',
      size: 9,
      align: 'left',
    })
    cur = 82
  }

  pushTitleBlock()

  const newPage = (): void => {
    pages.push({ lays: [] })
    cur = 56
  }

  // Returns true when there is room for `needed` more points on this page.
  const room = (needed: number): boolean => cur + needed <= CONTENT_BOTTOM
  // Advances to a fresh page when needed; returns true if this happened.
  const pageBreakIf = (needed: number): boolean => {
    if (!room(needed)) {
      newPage()
      return true
    }
    return false
  }

  const drawCell = (
    x: number,
    yTop: number,
    w: number,
    h: number,
    text: string,
    font: Font,
    size: number,
    align: Align,
    maxChars: number,
  ): void => {
    push({ x, yTop, w, h, text: truncate(text, maxChars), font, size, align })
  }

  const drawTable = (
    heading: string,
    headers: readonly string[],
    rows: readonly (readonly string[])[],
  ) => {
    const colW = columnWidth(headers)
    const numericColumns = headers.map((_, c) => isNumericColumn(rows.map((row) => [row[c]])))
    const maxChars = Math.max(Math.floor(colW / 4.6), 2)

    if (heading !== '—') {
      pageBreakIf(19 + HEADER_HEIGHT)
      push({
        x: MARGIN,
        yTop: cur,
        w: PAGE_WIDTH - 2 * MARGIN,
        h: 16,
        text: heading,
        font: 'F2',
        size: 11,
        align: 'left',
      })
      cur += 19
    } else {
      pageBreakIf(HEADER_HEIGHT)
    }

    push({
      x: MARGIN,
      yTop: cur,
      w: colW * headers.length,
      h: HEADER_HEIGHT,
      fill: '0.92 0.92 0.92',
    })
    for (let c = 0; c < headers.length; c++) {
      drawCell(
        MARGIN + c * colW,
        cur + 4,
        colW,
        HEADER_HEIGHT - 4,
        headers[c],
        'F2',
        8.5,
        c === 0 ? 'left' : 'right',
        maxChars,
      )
    }
    cur += HEADER_HEIGHT

    for (const row of rows) {
      pageBreakIf(ROW_HEIGHT)
      push({
        x: MARGIN,
        yTop: cur,
        w: colW * headers.length,
        h: ROW_HEIGHT,
        fill: '0.96 0.96 0.96',
      })
      for (let c = 0; c < headers.length; c++) {
        const align: Align = numericColumns[c] ? 'right' : 'left'
        drawCell(
          MARGIN + c * colW,
          cur + 4.5,
          colW,
          ROW_HEIGHT - 4,
          row[c] ?? '',
          'F1',
          8.5,
          align,
          maxChars,
        )
      }
      cur += ROW_HEIGHT
    }
    cur += 4
  }

  for (const table of doc.tables) {
    drawTable(table.heading, table.headers, table.rows)
    if (cur > CONTENT_BOTTOM - 20) newPage()
  }

  pages.forEach((page, i) => {
    page.lays.push({
      x: MARGIN,
      yTop: PAGE_HEIGHT - 28,
      w: PAGE_WIDTH - 2 * MARGIN,
      h: 10,
      text: `DENTORA — ${i + 1}/${pages.length}`,
      font: 'F1',
      size: 8,
      align: 'right',
    })
  })

  return pages
}

function renderContent(page: Page): string {
  const ops: string[] = []
  for (const lay of page.lays) {
    if (lay.fill) {
      const y = PAGE_HEIGHT - lay.yTop - lay.h
      ops.push(`${lay.x} ${y.toFixed(2)} ${lay.w.toFixed(2)} ${lay.h.toFixed(2)} re f`)
    }
    if (lay.text !== undefined) {
      const font = lay.font ?? 'F1'
      const size = lay.size ?? 8.5
      const y = PAGE_HEIGHT - lay.yTop - lay.h + 3
      const x = lay.align === 'right' ? lay.x + lay.w - textWidthPx(lay.text, size) : lay.x
      ops.push(
        `BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfString(lay.text)}) Tj ET`,
      )
    }
  }
  return `q 0 g\n${ops.join('\n')}\nQ`
}

export function renderPdf(doc: ReportDocument): Uint8Array {
  const pages = layoutPages(doc)
  const contents = pages.map(renderContent)

  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  objects.push(
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  )
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  )

  for (let i = 0; i < pages.length; i++) {
    const pageObj = 5 + i * 2
    const contentObj = pageObj + 1
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`,
    )
    const stream = contents[i]
    // The stream is latin1-built, so string length equals byte length.
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  }

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`

  // Down-convert to latin1 bytes: every written code unit is 0..255.
  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff
  return bytes
}
