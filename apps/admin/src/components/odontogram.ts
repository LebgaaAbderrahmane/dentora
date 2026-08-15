import type { ToothCondition, ToothStatus, ToothSurface } from '@dentora/contracts'

export const TOOTH_SURFACES: ToothSurface[] = ['m', 'd', 'o', 'b', 'l']

export const TOOTH_CONDITIONS: ToothCondition[] = [
  'caries',
  'filling',
  'sealant',
  'fracture',
  'wear',
  'stain',
]

export const TOOTH_STATUSES: ToothStatus[] = ['present', 'missing', 'implant', 'crown', 'root']
