import { u } from '@/data/images'

export const PHONE = '(800) 559-2648'
export const EMAIL = 'hello@dentoraclinic.com'

export const heroImage = u('photo-1588776814546-1ffcf47267a5', 1920)
export const clinicImage = u('photo-1629909613654-28e377c37b09', 800)
export const doctorImage = u('photo-1612349317150-e413f6a5b16d', 400)
export const teamImage = u('photo-1559839734-2b71ea197ec2', 1000)
export const ctaImage = u('photo-1508214751196-bcfd4ca60f91', 1600)

export const stats: StatDef[] = [
  { value: 98, label: 'Satisfaction Rate', suffix: '%', decimals: 0 },
  { value: 2000, label: 'Smiles Transformed', suffix: '+', decimals: 0, short: true },
  { value: 4.9, label: 'Customer Rating', decimals: 1, star: true },
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

export const doctor = {
  name: 'Dr. Daniel Carter',
  role: 'Lead Dental Specialist',
  rating: '★ 4.9 (40+ reviews)',
  image: doctorImage,
}

export const services = [
  {
    price: 'FROM $80',
    title: 'Dental Check-Up',
    body: 'Comprehensive examination of your teeth, gums, and jaw. Includes digital X-rays and a full treatment plan.',
    image: u('photo-1606811841689-23dfddce3e95', 800),
    alt: 'Dentist examining a patient with a dental mirror and explorer',
  },
  {
    price: 'FROM $120',
    title: 'Teeth Cleaning',
    body: 'Professional scaling and polishing to remove plaque, tartar, and surface stains for a healthier smile.',
    image: u('photo-1551601651-2a8555f1a136', 800),
    alt: 'Dental tools on a bright work surface',
  },
  {
    price: 'FROM $299',
    title: 'Tooth Whitening',
    body: 'Professional in-office or at-home whitening to brighten your smile by up to 8 shades.',
    image: u('photo-1609840114035-3c981b782dfe', 800),
    alt: 'Bright, healthy smile after professional whitening',
  },
  {
    price: 'FROM $1,800',
    title: 'Dental Implants',
    body: 'Permanent, natural-looking replacements for missing teeth — surgically placed and built to last a lifetime.',
    image: u('photo-1599490659213-e2b9527bd087', 800),
    alt: 'Dental implant model with crown',
  },
  {
    price: 'FROM $650',
    title: 'Veneers & Crowns',
    body: 'Custom-crafted porcelain shells and crowns to restore shape, color, and strength to damaged teeth.',
    image: u('photo-1615464556841-6116e61058f4', 800),
    alt: 'Ceramic dental restoration on a front tooth',
  },
  {
    price: 'SAME DAY',
    title: 'Emergency Care',
    body: 'Same-day emergency appointments for toothaches, broken teeth, lost fillings, and dental pain. Call anytime.',
    image: u('photo-1543783207-ec64e4d95325', 800),
    alt: 'Dentist providing urgent dental care',
  },
]

export const whyChecklist = [
  'Dental check-ups',
  'Hygiene treatments',
  'Crowns, veneers & bridges',
  'Root canal treatment',
  'Dental implant restoration',
  'Professional tooth whitening',
]

export const processSteps = [
  {
    number: '01',
    title: 'Book Online',
    body: "Fill out our quick form or call us — we'll confirm your appointment within the hour.",
    image: u('photo-1516321318423-f06f85e504b3', 700),
    alt: 'Booking an appointment on a laptop at home',
  },
  {
    number: '02',
    title: 'Welcome Visit',
    body: "Arrive at your scheduled time, meet your dentist, and we'll go over your dental history.",
    image: u('photo-1521791136064-7986c2920216', 700),
    alt: 'Warm welcome at the clinic reception',
  },
  {
    number: '03',
    title: 'Smile Assessment',
    body: 'Digital X-rays, full examination, and a transparent care plan with pricing before we start.',
    image: u('photo-1579684385127-1ef15d508118', 700),
    alt: 'Dentist explaining results on a screen',
  },
  {
    number: '04',
    title: 'Treatment & Care',
    body: "Treatment completed, results reviewed, aftercare explained. We follow up to make sure you're happy.",
    image: u('photo-1584515933487-779824d29309', 700),
    alt: 'Happy patient leaving the clinic with a bright smile',
  },
]

export const testimonials = [
  {
    quote:
      "I've been going to Dentora for two years and I won't go anywhere else. They explained every step of my treatment clearly and I never felt pressured. Best dental experience I've had.",
    name: 'Emily K.',
    source: 'Verified Google Review',
    image: u('photo-1544005313-94ddf0286df2', 200),
  },
  {
    quote:
      "As someone who used to dread the dentist, Dentora completely changed my experience. Painless, quick, and the results were incredible. My smile has never looked better.",
    name: 'Marcus T.',
    source: 'Verified Google Review',
    image: u('photo-1506794778202-cad84cf45f1d', 200),
  },
  {
    quote:
      "Brought my whole family here after a recommendation. The team is patient and gentle with my kids, which means everything. We're Dentora patients for life.",
    name: 'Sarah L.',
    source: 'Verified Google Review',
    image: u('photo-1494790108377-be9c29b29330', 200),
  },
]

export const faqs = [
  {
    q: 'Do you accept new patients?',
    a: "Yes — we're always welcoming new patients and their families. You can book online, call us, or simply walk in during opening hours. Same-day appointments are often available.",
  },
  {
    q: 'Is dental treatment painful?',
    a: "We prioritize your comfort at every step. All treatments are performed with local anesthesia so you don't feel pain during the procedure. We also offer sedation options for anxious patients.",
  },
  {
    q: 'How often should I come in for a check-up?',
    a: "We recommend a dental check-up and professional cleaning every 6 months. Some patients may benefit from more frequent visits — your dentist will advise based on your individual needs.",
  },
  {
    q: 'Do you offer payment plans?',
    a: "Yes. We offer flexible monthly payment plans through our financing partners. Ask our team about 0% interest options on qualifying treatments over $300.",
  },
  {
    q: 'What should I do in a dental emergency?',
    a: "Call our emergency line immediately — (800) 559-2648. We offer same-day emergency slots for toothaches, broken teeth, lost crowns, and dental trauma. Don't wait if you're in pain.",
  },
  {
    q: 'Can children be patients at Dentora?',
    a: "Absolutely. We treat patients of all ages, including children from their first tooth onwards. Our team is experienced in making young patients feel comfortable and confident about dental care.",
  },
  {
    q: 'How long do treatments take?',
    a: "It depends on the treatment. A standard check-up takes 45–60 minutes. Cleaning is 45 minutes. More complex procedures like implants or crowns involve multiple visits — your dentist will give you a full timeline at your consultation.",
  },
]