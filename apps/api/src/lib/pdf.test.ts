import { describe, expect, it } from 'vitest'
import { encodePdfText, escapePdfString, renderPdf } from './pdf'
import type { ReportDocument } from './reportMath'

function toLatin1(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i])
  return out
}

const doc = (rowCount = 3): ReportDocument => ({
  title: "Rapport d'occupation",
  subtitle: 'Période: 2026-08-16 → 2026-08-18',
  tables: [
    {
      heading: '—',
      headers: ['Date', 'Planifiés', 'Réalisés'],
      rows: Array.from({ length: rowCount }, (_, i) => [
        `2026-08-${17 + i}`,
        String(10 + i),
        String(8 + i),
      ]),
    },
  ],
})

describe('encodePdfText', () => {
  it('keeps ASCII and maps French diacritics to cp1252 bytes', () => {
    expect(encodePdfText('DENTORA')).toBe('DENTORA')
    expect(encodePdfText('occupation')).toBe('occupation')
    expect(encodePdfText('é').charCodeAt(0)).toBe(0xe9)
    expect(encodePdfText('ç').charCodeAt(0)).toBe(0xe7)
  })

  it('degrades non-Latin glyphs (e.g. Arabic) to a placeholder', () => {
    expect(encodePdfText('مرحبا')).toBe('?????'.slice(0, 5))
    expect(encodePdfText('مرحبا').charCodeAt(0)).toBe(0x3f)
  })
})

describe('escapePdfString', () => {
  it('escapes parentheses and backslashes', () => {
    expect(escapePdfString('a(b)\\c(d)')).toBe('a\\(b\\)\\\\c\\(d\\)')
  })
})

describe('renderPdf', () => {
  it('produces a well-formed single-page document with a resolvable xref', () => {
    const pdf = toLatin1(renderPdf(doc()))
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf.endsWith('%%EOF\n')).toBe(true)
    expect(pdf).toContain('/Helvetica')
    expect(pdf).toContain('/WinAnsiEncoding')

    const startxref = Number(pdf.match(/startxref\n(\d+)/)?.[1])
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref')

    // every non-zero xref entry must point at "<n> 0 obj"
    const entries = pdf
      .slice(startxref)
      .match(/^\d{10} 00000 n/gm)!
      .map((line) => Number(line.slice(0, 10)))
    entries.forEach((offset, i) => {
      expect(pdf.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`)
    })
    expect(entries).toHaveLength(6) // catalog + pages + 2 fonts + page + content
  })

  it('writes the French title through their WinAnsi bytes', () => {
    const pdf = toLatin1(renderPdf(doc()))
    expect(pdf).toContain("(Rapport d'occupation)")
  })

  it('splits long reports across multiple pages', () => {
    const pdf = toLatin1(renderPdf(doc(200)))
    const pageCount = Number(pdf.match(/\/Count (\d+)/)?.[1])
    expect(pageCount).toBeGreaterThan(1)
    expect(pdf).toContain(encodePdfText(`DENTORA — 1/${pageCount}`))
  })
})
