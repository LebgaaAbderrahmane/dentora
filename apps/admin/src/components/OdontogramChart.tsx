import Odontogram from 'react-odontogram'
import 'react-odontogram/style.css'
import { useTheme } from '@dentora/ui'
import type { ToothEntry, ToothStatus } from '@dentora/contracts'

const STATUS_COLOR: Record<ToothStatus, { fill: string; outline: string }> = {
  present: { fill: '#ffffff', outline: '#94a3b8' },
  missing: { fill: '#e2e8f0', outline: '#cbd5e1' },
  implant: { fill: '#99f6e4', outline: '#2dd4bf' },
  crown: { fill: '#fef3c7', outline: '#fbbf24' },
  root: { fill: '#e7c9a9', outline: '#a16207' },
}

export function OdontogramChart({
  teeth,
  selected,
  onSelect,
}: {
  teeth: Record<string, ToothEntry> | undefined
  selected: string | null
  onSelect: (code: string) => void
}) {
  const { resolvedTheme } = useTheme()
  const groups = Object.values(STATUS_COLOR).map(({ fill, outline }) => ({
    label: '',
    teeth: [] as string[],
    fillColor: fill,
    outlineColor: outline,
  }))

  if (teeth) {
    for (const [code, entry] of Object.entries(teeth)) {
      if (entry.status === 'present') continue
      const color = STATUS_COLOR[entry.status]
      const group = groups.find((g) => g.fillColor === color.fill)
      group?.teeth.push(`teeth-${code}`)
    }
  }

  return (
    <Odontogram
      singleSelect
      notation="FDI"
      theme={resolvedTheme}
      layout="square"
      readOnly={false}
      defaultSelected={selected ? [`teeth-${selected}`] : []}
      teethConditions={groups}
      onChange={(sel) => {
        const fdi = sel[0]?.notations.fdi
        if (fdi) onSelect(fdi)
      }}
    />
  )
}
