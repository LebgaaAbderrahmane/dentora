import { u } from '@/data/images'

export const PHONE = '+213 21 55 88 00'
export const EMERGENCY_PHONE = '+213 555 00 00 00'
export const PHONE_TEL = 'tel:+21321558800'
export const EMERGENCY_TEL = 'tel:+213555000000'
export const EMAIL_LINK = 'mailto:hello@dentora.dz'
export const EMAIL = 'hello@dentora.dz'

export const heroImage = u('photo-1588776814546-1ffcf47267a5', 1920)
export const clinicImage = u('photo-1629909613654-28e377c37b09', 800)
export const doctorImage = u('photo-1612349317150-e413f6a5b16d', 400)
export const teamImage = u('photo-1559839734-2b71ea197ec2', 1000)
export const ctaImage = u('photo-1508214751196-bcfd4ca60f91', 1600)

export const serviceImages = [
  u('photo-1606811841689-23dfddce3e95', 800),
  u('photo-1551601651-2a8555f1a136', 800),
  u('photo-1609840114035-3c981b782dfe', 800),
  u('photo-1599490659213-e2b9527bd087', 800),
  u('photo-1615461066841-6116e61058f4', 800),
  u('photo-1543783207-ec64e4d95325', 800),
]

export const processImages = [
  u('photo-1516321318423-f06f85e504b3', 700),
  u('photo-1521791136064-7986c2920216', 700),
  u('photo-1579684385127-1ef15d508118', 700),
  u('photo-1584515933487-779824d29309', 700),
]

export const testimonialImages = [
  u('photo-1544005313-94ddf0286df2', 200),
  u('photo-1506794778202-cad84cf45f1d', 200),
  u('photo-1494790108377-be9c29b29330', 200),
]

export const stats: StatDef[] = [
  { value: 98, label: 'about.statSatisfaction', suffix: '%', decimals: 0 },
  { value: 2000, label: 'about.statSmiles', suffix: '+', decimals: 0, short: true },
  { value: 4.9, label: 'about.statRating', decimals: 1, star: true },
]

export interface StatDef {
  value: number
  label: string
  suffix?: string
  prefix?: string
  decimals?: number
  short?: boolean
  star?: boolean
}