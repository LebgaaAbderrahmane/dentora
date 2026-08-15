import type { KeyboardEvent } from 'react'
import type { MessageKey } from '@dentora/i18n'
import type { ToothCondition, ToothEntry, ToothStatus, ToothSurface } from '@dentora/contracts'
import { TOOTH_SURFACES } from './odontogram'

const FDI_ROWS: string[][] = [
  ['18', '17', '16', '15', '14', '13', '12', '11'],
  ['21', '22', '23', '24', '25', '26', '27', '28'],
  ['48', '47', '46', '45', '44', '43', '42', '41'],
  ['38', '37', '36', '35', '34', '33', '32', '31'],
]

const STATUS_KEY: Record<ToothStatus, MessageKey> = {
  present: 'patients.od.status.present',
  missing: 'patients.od.status.missing',
  implant: 'patients.od.status.implant',
  crown: 'patients.od.status.crown',
  root: 'patients.od.status.root',
}

const STATUS_FILL: Record<ToothStatus, string> = {
  present: '#f8fafc',
  missing: '#e2e8f0',
  implant: '#99f6e4',
  crown: '#fef3c7',
  root: '#e7c9a9',
}

const STATUS_STROKE: Record<ToothStatus, string> = {
  present: '#94a3b8',
  missing: '#cbd5e1',
  implant: '#2dd4bf',
  crown: '#fbbf24',
  root: '#a16207',
}

const CONDITION_COLOR: Record<ToothCondition, string> = {
  caries: '#ef4444',
  filling: '#3b82f6',
  sealant: '#22c55e',
  fracture: '#f59e0b',
  wear: '#a855f7',
  stain: '#c084fc',
}

const CELL_W = 64
const CELL_H = 72
const GAP = 8
const X0 = 16
const Y0 = 16

function surfaceOffset(code: string, surface: ToothSurface): { x: number; y: number } {
  const row = Math.floor((+code - 10) / 10)
  const upper = row === 0 || row === 1
  switch (surface) {
    case 'm':
      return { x: 0, y: CELL_H / 2 }
    case 'd':
      return { x: CELL_W, y: CELL_H / 2 }
    case 'o':
      return { x: CELL_W / 2, y: upper ? 0 : CELL_H }
    case 'b':
      return { x: CELL_W / 2, y: upper ? CELL_H : CELL_H / 2 }
    case 'l':
      return { x: CELL_W / 2, y: upper ? CELL_H / 2 : CELL_H }
  }
}

export function OdontogramChart({
  teeth,
  selected,
  onSelect,
  t,
}: {
  teeth: Record<string, ToothEntry> | undefined
  selected: string | null
  onSelect: (code: string) => void
  t: (key: MessageKey) => string
}) {
  const cols = 8
  const rows = FDI_ROWS.length
  const w = X0 * 2 + cols * CELL_W + (cols - 1) * GAP
  const h = Y0 * 2 + rows * CELL_H + (rows - 1) * GAP

  const xFor = (col: number) => X0 + col * (CELL_W + GAP)
  const yFor = (row: number) => Y0 + row * (CELL_H + GAP)

  function handleKey(code: string) {
    return (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(code)
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="group"
      aria-label={t('patients.od.selectTooth')}
    >
      {FDI_ROWS.map((codes, row) => (
        <g key={row}>
          {codes.map((code, col) => {
            const entry = teeth?.[code]
            const fill = entry ? STATUS_FILL[entry.status] : STATUS_FILL.present
            const stroke = entry ? STATUS_STROKE[entry.status] : STATUS_STROKE.present
            const x = xFor(col)
            const y = yFor(row)
            const isSelected = selected === code
            return (
              <g
                key={code}
                role="button"
                tabIndex={0}
                aria-label={`${code} ${t(entry ? STATUS_KEY[entry.status] : 'patients.od.status.present')}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(code)}
                onKeyDown={handleKey(code)}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  x={x}
                  y={y}
                  width={CELL_W}
                  height={CELL_H}
                  rx={8}
                  fill={fill}
                  stroke={isSelected ? '#0f172a' : stroke}
                  strokeWidth={isSelected ? 2.5 : 1.25}
                />
                <text
                  x={x + CELL_W / 2}
                  y={y + CELL_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none"
                  fontSize={15}
                  fontWeight={600}
                  fill="#334155"
                >
                  {code}
                </text>
                {entry
                  ? (TOOTH_SURFACES as ToothSurface[]).map((s) =>
                      entry.surfaces?.[s]?.filter(Boolean).length ? (
                        <circle
                          key={s}
                          cx={x + surfaceOffset(code, s).x}
                          cy={y + surfaceOffset(code, s).y}
                          r={5.5}
                          fill={CONDITION_COLOR[entry.surfaces[s][0] as ToothCondition]}
                          className="pointer-events-none"
                        />
                      ) : null,
                    )
                  : null}
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}
