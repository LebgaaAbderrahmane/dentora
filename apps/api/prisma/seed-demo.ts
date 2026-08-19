import 'dotenv/config'
import { hash } from 'bcryptjs'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { encrypt } from '../src/lib/encryption'

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo-pass-123'

type StaffSeed = {
  name: string
  email: string
  role: 'ADMIN' | 'DENTIST' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'INTERN'
}

const STAFF: StaffSeed[] = [
  { name: 'Dr. Karim Bensalem', email: 'karim@dentora.dz', role: 'DENTIST' },
  { name: 'Dr. Amel Haddad', email: 'amel@dentora.dz', role: 'DENTIST' },
  { name: 'Yasmine Benali', email: 'yasmine@dentora.dz', role: 'RECEPTIONIST' },
  { name: 'Sofiane Merabet', email: 'sofiane@dentora.dz', role: 'RECEPTIONIST' },
  { name: 'Nadia Cherif', email: 'nadia@dentora.dz', role: 'ACCOUNTANT' },
  { name: 'Rayan Meziane', email: 'rayan@dentora.dz', role: 'INTERN' },
]

const SERVICES: Array<{
  name: string
  category: 'CONSULTATION' | 'SURGERY' | 'CARE' | 'HYGIENE' | 'PROSTHETIC_ORTHO' | 'IMAGING'
  priceDZD: number
  durationMinutes: number
  reimbursablePct: number
}> = [
  {
    name: 'Consultation',
    category: 'CONSULTATION',
    priceDZD: 1500,
    durationMinutes: 15,
    reimbursablePct: 30,
  },
  {
    name: 'Contrôle',
    category: 'CONSULTATION',
    priceDZD: 1200,
    durationMinutes: 10,
    reimbursablePct: 30,
  },
  {
    name: 'Urgence dentaire',
    category: 'CONSULTATION',
    priceDZD: 2500,
    durationMinutes: 20,
    reimbursablePct: 0,
  },
  {
    name: 'Détartrage',
    category: 'HYGIENE',
    priceDZD: 3000,
    durationMinutes: 30,
    reimbursablePct: 10,
  },
  {
    name: 'Blanchiment',
    category: 'HYGIENE',
    priceDZD: 25000,
    durationMinutes: 60,
    reimbursablePct: 0,
  },
  {
    name: 'Soin carie (obturation)',
    category: 'CARE',
    priceDZD: 4000,
    durationMinutes: 30,
    reimbursablePct: 30,
  },
  {
    name: 'Dévitalisation',
    category: 'CARE',
    priceDZD: 8000,
    durationMinutes: 45,
    reimbursablePct: 30,
  },
  {
    name: 'Extraction simple',
    category: 'SURGERY',
    priceDZD: 3500,
    durationMinutes: 30,
    reimbursablePct: 30,
  },
  {
    name: 'Extraction chirurgicale (dent de sagesse)',
    category: 'SURGERY',
    priceDZD: 12000,
    durationMinutes: 60,
    reimbursablePct: 30,
  },
  {
    name: 'Implant dentaire',
    category: 'SURGERY',
    priceDZD: 60000,
    durationMinutes: 90,
    reimbursablePct: 0,
  },
  {
    name: 'Couronne céramique',
    category: 'PROSTHETIC_ORTHO',
    priceDZD: 35000,
    durationMinutes: 60,
    reimbursablePct: 0,
  },
  {
    name: 'Prothèse amovible',
    category: 'PROSTHETIC_ORTHO',
    priceDZD: 45000,
    durationMinutes: 60,
    reimbursablePct: 0,
  },
  {
    name: 'Appareil orthodontique',
    category: 'PROSTHETIC_ORTHO',
    priceDZD: 80000,
    durationMinutes: 60,
    reimbursablePct: 0,
  },
  {
    name: 'Panoramique dentaire',
    category: 'IMAGING',
    priceDZD: 2000,
    durationMinutes: 10,
    reimbursablePct: 40,
  },
  {
    name: 'Radio rétro-alvéolaire',
    category: 'IMAGING',
    priceDZD: 1000,
    durationMinutes: 5,
    reimbursablePct: 40,
  },
]

const PATIENTS: Array<{
  firstName: string
  lastName: string
  gender: 'M' | 'F'
  birthDate: string
  phone: string
  email?: string
  address: string
  notes?: string
  archived?: boolean
  createdAtDaysAgo?: number
  medical?: Record<string, string>
  odontogram?: Record<string, { status: string; surfaces: Record<string, string[]> }>
}> = [
  {
    firstName: 'Mohammed',
    lastName: 'Bouzid',
    gender: 'M',
    birthDate: '1985-04-12',
    phone: '0550123456',
    email: 'm.bouzid@mail.dz',
    address: '12 rue Didouche Mourad, Alger',
    notes: 'Anxieux en fauteuil, prévenir avant tout geste chirurgical.',
    createdAtDaysAgo: 120,
    medical: {
      allergies: 'Pénicilline',
      conditions: 'HTA légère, suivie depuis 2019',
      medications: 'Amlodipine 5mg 1/jour',
      surgeryHistory: 'Appendicectomie (2015)',
      otherNotes: 'Patient fumeur (10/jour).',
    },
    odontogram: {
      '16': {
        status: 'present',
        surfaces: { m: ['filling'], d: ['caries'], o: ['filling'], b: [], l: [] },
      },
      '36': { status: 'present', surfaces: { m: ['filling'], d: [], o: ['caries'], b: [], l: [] } },
      '11': { status: 'missing', surfaces: { m: [], d: [], o: [], b: [], l: [] } },
    },
  },
  {
    firstName: 'Fatima',
    lastName: 'Ziani',
    gender: 'F',
    birthDate: '1992-09-03',
    phone: '0661234567',
    email: 'f.ziani@mail.dz',
    address: '3 cité 2000 logts, Hydra',
    createdAtDaysAgo: 90,
    odontogram: {
      '26': { status: 'present', surfaces: { m: [], d: ['caries'], o: [], b: [], l: [] } },
      '46': { status: 'crown', surfaces: { m: [], d: [], o: [], b: [], l: [] } },
    },
  },
  {
    firstName: 'Ahmed',
    lastName: 'Belkacem',
    gender: 'M',
    birthDate: '1978-01-25',
    phone: '0770987654',
    address: '45 avenue Pasteur, Alger-Centre',
    createdAtDaysAgo: 45,
  },
  {
    firstName: 'Amina',
    lastName: 'Khelifi',
    gender: 'F',
    birthDate: '2001-11-19',
    phone: '0559876543',
    email: 'amina.k@mail.dz',
    address: '8 rue des Frères Abad, Bab Ezzouar',
    notes: 'Bruxisme nocturne signalé, surveiller usure.',
    createdAtDaysAgo: 20,
    medical: { conditions: 'Asthme léger', lifestyle: 'Grince des dents la nuit.' },
  },
  {
    firstName: 'Yacine',
    lastName: 'Touati',
    gender: 'M',
    birthDate: '1965-07-08',
    phone: '0663334455',
    address: '21 lotissement les Palmiers, Bordj El Kiffan',
    createdAtDaysAgo: 12,
    odontogram: {
      '31': { status: 'missing', surfaces: { m: [], d: [], o: [], b: [], l: [] } },
      '41': { status: 'missing', surfaces: { m: [], d: [], o: [], b: [], l: [] } },
      '14': { status: 'present', surfaces: { m: ['wear'], d: [], o: ['wear'], b: [], l: [] } },
    },
  },
  {
    firstName: 'Lila',
    lastName: 'Benmoussa',
    gender: 'F',
    birthDate: '1998-03-22',
    phone: '0551122334',
    email: 'lila.b@mail.dz',
    address: '14 résidence Dar Es-Salem, Kouba',
    createdAtDaysAgo: 6,
    medical: { allergies: 'Latex', medications: 'Aucun traitement régulier' },
  },
  {
    firstName: 'Karim',
    lastName: 'Sahraoui',
    gender: 'M',
    birthDate: '1989-12-30',
    phone: '0775443322',
    address: '2 rue des Oliviers, El Harrach',
    createdAtDaysAgo: 2,
  },
  {
    firstName: 'Nesrine',
    lastName: 'Boukhalfa',
    gender: 'F',
    birthDate: '1995-06-15',
    phone: '0667889900',
    email: 'nesrine.b@mail.dz',
    address: '9 avenue du 1er Novembre, Bab Ezzouar',
    createdAtDaysAgo: 1,
    odontogram: {
      '48': { status: 'present', surfaces: { m: [], d: ['caries'], o: [], b: [], l: [] } },
      '38': { status: 'missing', surfaces: { m: [], d: [], o: [], b: [], l: [] } },
    },
  },
  {
    firstName: 'Slimane',
    lastName: 'Hadj',
    gender: 'M',
    birthDate: '1950-02-11',
    phone: '0661122334',
    address: '7 impasse des Mimosas, Hussein Dey',
    notes: 'Ancien patient, revenu pour prothèse complète.',
    archived: true,
    createdAtDaysAgo: 200,
  },
  {
    firstName: 'Ines',
    lastName: 'Guerroudj',
    gender: 'F',
    birthDate: '2003-08-27',
    phone: '0776554433',
    email: 'ines.g@mail.dz',
    address: '11 cité des Astres, Dar El Beida',
    createdAtDaysAgo: 60,
  },
  {
    firstName: 'Omar',
    lastName: 'Fares',
    gender: 'M',
    birthDate: '1980-05-05',
    phone: '0556677889',
    address: '5 rue des Frères Djemai, El Madania',
    createdAtDaysAgo: 3,
  },
  {
    firstName: 'Meriem',
    lastName: 'Abbas',
    gender: 'F',
    birthDate: '1990-10-01',
    phone: '0669988776',
    email: 'meriem.a@mail.dz',
    address: '16 boulevard Colonel Amirouche, Alger',
    createdAtDaysAgo: 40,
  },
]

const PRODUCTS: Array<{
  name: string
  code: string
  category:
    | 'ANESTHETICS'
    | 'DISPOSABLES'
    | 'MATERIALS'
    | 'INSTRUMENTS'
    | 'EQUIPMENT'
    | 'MEDICATIONS'
    | 'LABORATORY'
    | 'STATIONERY'
    | 'OTHER'
  unit: 'UNIT' | 'BOX' | 'PACK' | 'BOTTLE' | 'JAR' | 'SYRINGE' | 'SET' | 'KIT'
  reorderLevel: number
  quantityOnHand: number
  archived?: boolean
}> = [
  {
    name: 'Gants nitrile M',
    code: 'GN-M',
    category: 'DISPOSABLES',
    unit: 'BOX',
    reorderLevel: 5,
    quantityOnHand: 2,
  },
  {
    name: 'Masques chirurgicaux x50',
    code: 'MC-50',
    category: 'DISPOSABLES',
    unit: 'BOX',
    reorderLevel: 10,
    quantityOnHand: 12,
  },
  {
    name: 'Lidocaïne 2% (anesthésie)',
    code: 'LIDO-2',
    category: 'ANESTHETICS',
    unit: 'BOTTLE',
    reorderLevel: 6,
    quantityOnHand: 4,
  },
  {
    name: 'Composite A2 4g',
    code: 'COMP-A2',
    category: 'MATERIALS',
    unit: 'SYRINGE',
    reorderLevel: 8,
    quantityOnHand: 9,
  },
  {
    name: 'Kit détartreur ultrason',
    code: 'DET-US',
    category: 'INSTRUMENTS',
    unit: 'SET',
    reorderLevel: 1,
    quantityOnHand: 3,
  },
  {
    name: 'Blouse jetable L x40',
    code: 'BL-40',
    category: 'DISPOSABLES',
    unit: 'PACK',
    reorderLevel: 6,
    quantityOnHand: 8,
  },
  {
    name: 'Amalgame 50g',
    code: 'AMAL-50',
    category: 'MATERIALS',
    unit: 'UNIT',
    reorderLevel: 0,
    quantityOnHand: 15,
  },
  {
    name: 'Capteur radiologie RVG',
    code: 'RVG-1',
    category: 'EQUIPMENT',
    unit: 'UNIT',
    reorderLevel: 1,
    quantityOnHand: 1,
  },
  {
    name: 'Alginate 500g',
    code: 'ALG-500',
    category: 'MATERIALS',
    unit: 'JAR',
    reorderLevel: 4,
    quantityOnHand: 0,
  },
  {
    name: 'Amoxicilline 500mg x12',
    code: 'AMOX-500',
    category: 'MEDICATIONS',
    unit: 'BOX',
    reorderLevel: 5,
    quantityOnHand: 7,
  },
  {
    name: 'Aiguilles dentaires x100',
    code: 'AIG-100',
    category: 'DISPOSABLES',
    unit: 'PACK',
    reorderLevel: 3,
    quantityOnHand: 0,
  },
  {
    name: 'Gants nitrile L',
    code: 'GN-L',
    category: 'DISPOSABLES',
    unit: 'BOX',
    reorderLevel: 4,
    quantityOnHand: 20,
  },
  {
    name: 'Fil dentaire (archivé)',
    code: 'FIL-D',
    category: 'MATERIALS',
    unit: 'UNIT',
    reorderLevel: 0,
    quantityOnHand: 5,
    archived: true,
  },
]

const SUPPLIERS: Array<{ name: string; phone: string; email?: string; address: string }> = [
  {
    name: 'Alger Pharma',
    phone: '023 45 67 89',
    email: 'contact@algerpharma.dz',
    address: 'Zone industrielle, Rouiba',
  },
  {
    name: 'Dental DZ Distribution',
    phone: '021 98 76 54',
    email: 'commandes@dentaldz.dz',
    address: '5 rue Hassiba Ben Bouali, Alger',
  },
  {
    name: 'MediNorth Alger',
    phone: '0555 22 33 44',
    email: 'info@medinorth.dz',
    address: '11 rue des Frères Bouadou, Bab Ezzouar',
  },
  {
    name: 'OrthoCenter',
    phone: '0666 11 22 33',
    address: 'Centre commercial Bab Ezzouar, local 14',
  },
]

const EXPENSES: Array<{
  category:
    | 'SALARY'
    | 'RENT'
    | 'SUPPLIES'
    | 'EQUIPMENT'
    | 'UTILITIES'
    | 'MAINTENANCE'
    | 'MARKETING'
    | 'TAXES'
    | 'OTHER'
  amountDZD: number
  description: string
  daysAgo: number
  voided?: boolean
}> = [
  {
    category: 'SALARY',
    amountDZD: 320000,
    description: 'Salaires équipe (mois courant)',
    daysAgo: 2,
  },
  { category: 'RENT', amountDZD: 150000, description: 'Loyer local', daysAgo: 5 },
  { category: 'SUPPLIES', amountDZD: 48000, description: 'Gants, masques, blouses', daysAgo: 7 },
  { category: 'UTILITIES', amountDZD: 18500, description: 'Électricité + eau', daysAgo: 9 },
  { category: 'MAINTENANCE', amountDZD: 22000, description: 'Maintenance fauteuil', daysAgo: 12 },
  { category: 'MARKETING', amountDZD: 15000, description: 'Campagne Facebook', daysAgo: 15 },
  { category: 'EQUIPMENT', amountDZD: 120000, description: 'Autoclave (avance)', daysAgo: 20 },
  { category: 'TAXES', amountDZD: 30000, description: 'Taxe d’exploitation', daysAgo: 25 },
  { category: 'OTHER', amountDZD: 8000, description: 'Petite fourniture bureau', daysAgo: 3 },
  {
    category: 'SUPPLIES',
    amountDZD: 9500,
    description: 'Produit d’entretien (annulé)',
    daysAgo: 11,
    voided: true,
  },
]

const INVOICES: Array<{
  patientIndex: number
  daysAgo: number
  lines: Array<{ serviceIndex: number; quantity: number; priceDZD?: number }>
  payments: Array<{
    method: 'CASH' | 'CHEQUE' | 'CARD' | 'TRANSFER'
    amountDZD: number
    daysAgo: number
    refund?: number
  }>
  voided?: boolean
}> = [
  {
    patientIndex: 0,
    daysAgo: 28,
    lines: [
      { serviceIndex: 0, quantity: 1 },
      { serviceIndex: 8, quantity: 1 },
    ],
    payments: [{ method: 'CASH', amountDZD: 13500, daysAgo: 28 }],
  },
  {
    patientIndex: 1,
    daysAgo: 21,
    lines: [{ serviceIndex: 3, quantity: 1 }],
    payments: [{ method: 'CARD', amountDZD: 3000, daysAgo: 21 }],
  },
  {
    patientIndex: 3,
    daysAgo: 18,
    lines: [{ serviceIndex: 5, quantity: 2 }],
    payments: [{ method: 'CASH', amountDZD: 8000, daysAgo: 18 }],
  },
  {
    patientIndex: 4,
    daysAgo: 14,
    lines: [
      { serviceIndex: 13, quantity: 1 },
      { serviceIndex: 6, quantity: 1 },
    ],
    payments: [{ method: 'CHEQUE', amountDZD: 10000, daysAgo: 14 }],
  },
  {
    patientIndex: 5,
    daysAgo: 9,
    lines: [{ serviceIndex: 0, quantity: 1 }],
    payments: [{ method: 'CASH', amountDZD: 1500, daysAgo: 9, refund: 300 }],
  },
  {
    patientIndex: 6,
    daysAgo: 6,
    lines: [{ serviceIndex: 10, quantity: 1 }],
    payments: [{ method: 'TRANSFER', amountDZD: 35000, daysAgo: 6 }],
  },
  {
    patientIndex: 7,
    daysAgo: 3,
    lines: [
      { serviceIndex: 4, quantity: 1 },
      { serviceIndex: 0, quantity: 1 },
    ],
    payments: [{ method: 'CARD', amountDZD: 13000, daysAgo: 3 }],
  },
  {
    patientIndex: 11,
    daysAgo: 1,
    lines: [{ serviceIndex: 7, quantity: 1 }],
    payments: [{ method: 'CASH', amountDZD: 3500, daysAgo: 1 }],
  },
  {
    patientIndex: 2,
    daysAgo: 30,
    lines: [{ serviceIndex: 11, quantity: 1 }],
    payments: [],
    voided: true,
  },
]

type LedgerRow = {
  type: 'OPENING' | 'IN' | 'OUT' | 'ADJUST'
  quantity: number
  batch?: string
  expiryDays?: number
  daysAgo?: number
  reason?: string
}

const STOCK_LEDGER: Record<string, LedgerRow[]> = {
  'GN-M': [
    { type: 'IN', quantity: 5, batch: 'GN-07', expiryDays: 20, daysAgo: 30 },
    { type: 'OUT', quantity: 3, reason: 'Usage soins', daysAgo: 4 },
  ],
  'MC-50': [{ type: 'IN', quantity: 12, batch: 'MC-A', expiryDays: 90, daysAgo: 26 }],
  'LIDO-2': [
    { type: 'IN', quantity: 6, batch: 'LID-01', expiryDays: 15, daysAgo: 24 },
    { type: 'OUT', quantity: 2, reason: 'Anesthésie patient', daysAgo: 8 },
  ],
  'COMP-A2': [
    { type: 'IN', quantity: 4, batch: 'COMP-01', expiryDays: -5, daysAgo: 40 },
    { type: 'IN', quantity: 8, batch: 'COMP-02', expiryDays: 300, daysAgo: 40 },
    { type: 'OUT', quantity: 3, reason: 'Obturation 26', daysAgo: 2 },
  ],
  'DET-US': [{ type: 'OPENING', quantity: 3, daysAgo: 90 }],
  'BL-40': [{ type: 'OPENING', quantity: 8, daysAgo: 90 }],
  'AMAL-50': [{ type: 'OPENING', quantity: 15, daysAgo: 90 }],
  'RVG-1': [{ type: 'OPENING', quantity: 1, daysAgo: 90 }],
  'ALG-500': [
    { type: 'OPENING', quantity: 6, daysAgo: 90 },
    { type: 'OUT', quantity: 6, reason: 'Empreintes', daysAgo: 30 },
  ],
  'AMOX-500': [
    { type: 'IN', quantity: 5, batch: 'AMX-01', expiryDays: 25, daysAgo: 20 },
    { type: 'IN', quantity: 4, batch: 'AMX-02', expiryDays: 120, daysAgo: 20 },
    { type: 'OUT', quantity: 2, reason: 'Antibiothérapie', daysAgo: 6 },
  ],
  'AIG-100': [
    { type: 'OPENING', quantity: 4, daysAgo: 90 },
    { type: 'OUT', quantity: 4, reason: 'Usage quotidien', daysAgo: 40 },
  ],
  'GN-L': [{ type: 'IN', quantity: 20, daysAgo: 25 }],
  'FIL-D': [{ type: 'OPENING', quantity: 5, daysAgo: 90 }],
}

const PURCHASE_ORDERS: Array<{
  supplierIndex: number
  reference: string
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  orderedDaysAgo: number
  receivedDaysAgo?: number
  notes?: string
  lines: Array<{
    productIndex: number
    quantity: number
    unitPriceDZD: number
    receivedQuantity?: number
  }>
}> = [
  {
    supplierIndex: 0,
    reference: 'CMD-2026-001',
    status: 'DRAFT',
    orderedDaysAgo: 2,
    lines: [
      { productIndex: 0, quantity: 10, unitPriceDZD: 1200 },
      { productIndex: 1, quantity: 20, unitPriceDZD: 350 },
    ],
  },
  {
    supplierIndex: 3,
    reference: 'CMD-2026-002',
    status: 'ORDERED',
    orderedDaysAgo: 4,
    lines: [
      { productIndex: 12, quantity: 5, unitPriceDZD: 600 },
      { productIndex: 6, quantity: 50, unitPriceDZD: 900 },
    ],
  },
  {
    supplierIndex: 2,
    reference: 'CMD-2026-003',
    status: 'PARTIALLY_RECEIVED',
    orderedDaysAgo: 12,
    receivedDaysAgo: 8,
    lines: [
      { productIndex: 0, quantity: 10, unitPriceDZD: 1200, receivedQuantity: 5 },
      { productIndex: 11, quantity: 20, unitPriceDZD: 1100, receivedQuantity: 20 },
    ],
  },
  {
    supplierIndex: 1,
    reference: 'CMD-2026-004',
    status: 'RECEIVED',
    orderedDaysAgo: 20,
    receivedDaysAgo: 15,
    lines: [
      { productIndex: 3, quantity: 12, unitPriceDZD: 4500, receivedQuantity: 12 },
      { productIndex: 9, quantity: 9, unitPriceDZD: 800, receivedQuantity: 9 },
    ],
  },
  {
    supplierIndex: 0,
    reference: 'CMD-2026-005',
    status: 'CANCELLED',
    orderedDaysAgo: 6,
    notes: 'Annulée : rupture fournisseur.',
    lines: [
      { productIndex: 10, quantity: 10, unitPriceDZD: 700 },
      { productIndex: 8, quantity: 6, unitPriceDZD: 1500 },
    ],
  },
  {
    supplierIndex: 0,
    reference: 'CMD-2026-006',
    status: 'PARTIALLY_RECEIVED',
    orderedDaysAgo: 10,
    receivedDaysAgo: 5,
    lines: [{ productIndex: 2, quantity: 12, unitPriceDZD: 900, receivedQuantity: 6 }],
  },
  {
    supplierIndex: 2,
    reference: 'CMD-2026-007',
    status: 'RECEIVED',
    orderedDaysAgo: 30,
    receivedDaysAgo: 26,
    lines: [{ productIndex: 1, quantity: 12, unitPriceDZD: 320, receivedQuantity: 12 }],
  },
]

type AppointmentSeed = {
  patientIndex: number
  dentistIndex: number
  start: { day: number; hour: number; min: number }
  end: { day: number; hour: number; min: number }
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NOSHOW'
  notes?: string
}

const APPOINTMENTS: AppointmentSeed[] = [
  {
    patientIndex: 0,
    dentistIndex: 0,
    start: { day: 0, hour: 8, min: 30 },
    end: { day: 0, hour: 9, min: 0 },
    status: 'COMPLETED',
    notes: 'Contrôle post-extraction, cicatrisation bonne.',
  },
  {
    patientIndex: 3,
    dentistIndex: 0,
    start: { day: 0, hour: 9, min: 30 },
    end: { day: 0, hour: 10, min: 0 },
    status: 'NOSHOW',
  },
  {
    patientIndex: 5,
    dentistIndex: 1,
    start: { day: 0, hour: 10, min: 0 },
    end: { day: 0, hour: 10, min: 40 },
    status: 'COMPLETED',
    notes: 'Détartrage, conseils hygiène.',
  },
  {
    patientIndex: 1,
    dentistIndex: 0,
    start: { day: 0, hour: 11, min: 0 },
    end: { day: 0, hour: 11, min: 45 },
    status: 'CONFIRMED',
    notes: 'Dévitalisation 26.',
  },
  {
    patientIndex: 6,
    dentistIndex: 1,
    start: { day: 0, hour: 12, min: 0 },
    end: { day: 0, hour: 12, min: 30 },
    status: 'CANCELLED',
  },
  {
    patientIndex: 7,
    dentistIndex: 1,
    start: { day: 0, hour: 14, min: 0 },
    end: { day: 0, hour: 14, min: 30 },
    status: 'CONFIRMED',
  },
  {
    patientIndex: 4,
    dentistIndex: 0,
    start: { day: 0, hour: 15, min: 0 },
    end: { day: 0, hour: 15, min: 30 },
    status: 'CONFIRMED',
    notes: 'Empreinte pour couronne 14.',
  },
  {
    patientIndex: 2,
    dentistIndex: 0,
    start: { day: 0, hour: 16, min: 30 },
    end: { day: 0, hour: 17, min: 0 },
    status: 'PENDING',
    notes: 'Urgence douleur 46.',
  },
  {
    patientIndex: 8,
    dentistIndex: 1,
    start: { day: 0, hour: 17, min: 0 },
    end: { day: 0, hour: 18, min: 0 },
    status: 'PENDING',
    notes: 'Prothèse complète maxillaire.',
  },
  {
    patientIndex: 1,
    dentistIndex: 0,
    start: { day: 1, hour: 9, min: 0 },
    end: { day: 1, hour: 9, min: 45 },
    status: 'CONFIRMED',
  },
  {
    patientIndex: 4,
    dentistIndex: 0,
    start: { day: 2, hour: 10, min: 0 },
    end: { day: 2, hour: 10, min: 30 },
    status: 'CONFIRMED',
  },
  {
    patientIndex: 9,
    dentistIndex: 1,
    start: { day: 3, hour: 11, min: 0 },
    end: { day: 3, hour: 11, min: 30 },
    status: 'CONFIRMED',
  },
  {
    patientIndex: 11,
    dentistIndex: 0,
    start: { day: -2, hour: 9, min: 0 },
    end: { day: -2, hour: 9, min: 30 },
    status: 'COMPLETED',
  },
  {
    patientIndex: 3,
    dentistIndex: 1,
    start: { day: -5, hour: 10, min: 0 },
    end: { day: -5, hour: 10, min: 40 },
    status: 'COMPLETED',
  },
  {
    patientIndex: 5,
    dentistIndex: 0,
    start: { day: -8, hour: 14, min: 0 },
    end: { day: -8, hour: 14, min: 30 },
    status: 'COMPLETED',
  },
  {
    patientIndex: 6,
    dentistIndex: 1,
    start: { day: -12, hour: 15, min: 0 },
    end: { day: -12, hour: 15, min: 45 },
    status: 'NOSHOW',
  },
  {
    patientIndex: 10,
    dentistIndex: 0,
    start: { day: -15, hour: 9, min: 30 },
    end: { day: -15, hour: 10, min: 0 },
    status: 'COMPLETED',
  },
  {
    patientIndex: 7,
    dentistIndex: 0,
    start: { day: -20, hour: 11, min: 0 },
    end: { day: -20, hour: 11, min: 30 },
    status: 'COMPLETED',
  },
  {
    patientIndex: 9,
    dentistIndex: 1,
    start: { day: -24, hour: 16, min: 0 },
    end: { day: -24, hour: 16, min: 30 },
    status: 'COMPLETED',
  },
  {
    patientIndex: 11,
    dentistIndex: 1,
    start: { day: 1, hour: 14, min: 0 },
    end: { day: 1, hour: 14, min: 30 },
    status: 'CONFIRMED',
  },
]

type WaitlistSeed = {
  patientIndex: number
  status: 'PENDING' | 'CONTACTED' | 'BOOKED' | 'CANCELLED'
  preferredDaysAgo?: number
  notes?: string
  appointmentIndex?: number
}

const WAITLIST: WaitlistSeed[] = [
  {
    patientIndex: 10,
    status: 'PENDING',
    preferredDaysAgo: -2,
    notes: 'Douleur au niveau de la 46.',
  },
  { patientIndex: 2, status: 'PENDING', notes: 'Demande rendez-vous contrôle.' },
  { patientIndex: 9, status: 'CONTACTED', preferredDaysAgo: -1 },
  { patientIndex: 11, status: 'BOOKED', appointmentIndex: 19 },
  { patientIndex: 4, status: 'CANCELLED', notes: 'Rappel non abouti.' },
]

// Clinical stock usage tied to appointments (3.6, ADR 026). Each row is applied by
// appending an OUT ledger entry (with `appointmentId`) + a TreatmentStockConsumption
// row + the matching product decrement, so `Σ ledger == quantityOnHand` keeps holding.
type ConsumptionSeed = {
  appointmentIndex: number
  productIndex: number
  quantity: number
  dentistIndex: number
  batch?: string
  reason?: string
}

const CONSUMPTIONS: ConsumptionSeed[] = [
  {
    appointmentIndex: 0,
    productIndex: 0,
    quantity: 1,
    dentistIndex: 0,
    batch: 'GN-07',
    reason: 'Contrôle post-extraction',
  },
  {
    appointmentIndex: 2,
    productIndex: 1,
    quantity: 1,
    dentistIndex: 1,
    batch: 'MC-A',
    reason: 'Détartrage',
  },
  {
    appointmentIndex: 3,
    productIndex: 3,
    quantity: 1,
    dentistIndex: 0,
    batch: 'COMP-02',
    reason: 'Dévitalisation 26',
  },
  {
    appointmentIndex: 3,
    productIndex: 2,
    quantity: 1,
    dentistIndex: 0,
    batch: 'LID-01',
    reason: 'Dévitalisation 26',
  },
  {
    appointmentIndex: 12,
    productIndex: 9,
    quantity: 1,
    dentistIndex: 0,
    batch: 'AMX-01',
    reason: 'Antibiothérapie post-op',
  },
  {
    appointmentIndex: 13,
    productIndex: 1,
    quantity: 1,
    dentistIndex: 1,
    batch: 'MC-A',
    reason: 'Soin carie',
  },
  {
    appointmentIndex: 13,
    productIndex: 5,
    quantity: 1,
    dentistIndex: 1,
    reason: 'Soin carie',
  },
  {
    appointmentIndex: 14,
    productIndex: 2,
    quantity: 1,
    dentistIndex: 0,
    batch: 'LID-01',
    reason: 'Détartrage',
  },
]

// Instrument sterilization log seeds (3.6, ADR 026) — one row per autoclave/UV/chemical
// cycle. IN_PROGRESS rows are the live desk picture; terminal rows keep their timing.
type SterilizationSeed = {
  productIndex?: number
  instrument: string
  method: 'AUTOCLAVE' | 'CHEMICAL' | 'UV' | 'OTHER'
  cycle?: number
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedMinutesAgo: number
  completedMinutesAgo?: number
  notes?: string
  operatorIndex?: number
}

const STERILIZATIONS: SterilizationSeed[] = [
  {
    productIndex: 4,
    instrument: 'Kit détartreur ultrason',
    method: 'AUTOCLAVE',
    cycle: 39,
    status: 'COMPLETED',
    startedMinutesAgo: 2 * 24 * 60,
    completedMinutesAgo: 2 * 24 * 60 - 35,
    operatorIndex: 0,
  },
  {
    instrument: 'Coffret extraction',
    method: 'AUTOCLAVE',
    cycle: 40,
    status: 'COMPLETED',
    startedMinutesAgo: 24 * 60,
    completedMinutesAgo: 24 * 60 - 45,
    operatorIndex: 0,
  },
  {
    instrument: 'Miroirs (jeu)',
    method: 'UV',
    cycle: 2,
    status: 'FAILED',
    startedMinutesAgo: 24 * 60 + 120,
    completedMinutesAgo: 24 * 60 + 220,
    notes: 'Cycle interrompu : surchauffe.',
    operatorIndex: 1,
  },
  {
    instrument: 'Pointe à main turbine',
    method: 'AUTOCLAVE',
    cycle: 41,
    status: 'COMPLETED',
    startedMinutesAgo: 90,
    completedMinutesAgo: 40,
    operatorIndex: 1,
  },
  {
    instrument: 'Compositeurs (jeu)',
    method: 'CHEMICAL',
    cycle: 7,
    status: 'IN_PROGRESS',
    startedMinutesAgo: 15,
    notes: 'Désinfection chimique en cours.',
    operatorIndex: 0,
  },
]

function day(offset: number, hour: number, min: number): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, hour, min, 0, 0)
}

function dateOnly(daysAgo: number, hour = 9, min = 0): Date {
  return day(-daysAgo, hour, min)
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

  const branchName = process.env.BRANCH_NAME ?? 'Dentora Algiers'
  const branch =
    (await prisma.branch.findFirst({ where: { name: branchName } })) ??
    (await prisma.branch.create({ data: { name: branchName } }))
  const branchId = branch.id

  await prisma.treatmentStockConsumption.deleteMany({ where: { branchId } })
  await prisma.sterilizationLog.deleteMany({ where: { branchId } })
  await prisma.staffSchedule.deleteMany({ where: { branchId } })
  await prisma.attendanceLog.deleteMany({ where: { branchId } })
  await prisma.internProfile.deleteMany({ where: { branchId } })
  await prisma.payslip.deleteMany({ where: { branchId } })
  await prisma.stockLedgerEntry.deleteMany({ where: { branchId } })
  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { branchId } } })
  await prisma.purchaseOrder.deleteMany({ where: { branchId } })
  await prisma.supplier.deleteMany({ where: { branchId } })
  await prisma.product.deleteMany({ where: { branchId } })
  await prisma.payment.deleteMany({ where: { branchId } })
  await prisma.invoice.deleteMany({ where: { branchId } })
  await prisma.expense.deleteMany({ where: { branchId } })
  await prisma.service.deleteMany({ where: { branchId } })
  await prisma.waitlistEntry.deleteMany({ where: { branchId } })
  await prisma.appointment.deleteMany({ where: { branchId } })
  await prisma.patientDocument.deleteMany({ where: { branchId } })
  await prisma.patientOdontogram.deleteMany({ where: { patient: { branchId } } })
  await prisma.patientMedicalHistory.deleteMany({ where: { patient: { branchId } } })
  await prisma.user.updateMany({
    where: { branchId, role: 'PATIENT' },
    data: { patientId: null },
  })
  await prisma.user.deleteMany({ where: { branchId, role: 'PATIENT' } })
  await prisma.patient.deleteMany({ where: { branchId } })
  await prisma.auditLog.deleteMany({ where: { branchId } })
  await prisma.setting.deleteMany({ where: { branchId } })

  const passwordHash = await hash(DEMO_PASSWORD, 12)
  const users: Record<string, { id: string }> = {}
  for (const s of STAFF) {
    users[s.email] = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash, role: s.role, branchId, active: true },
      create: { email: s.email, passwordHash, name: s.name, role: s.role, branchId },
    })
  }
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@dentora.dz').toLowerCase()
  const adminPasswordHash = await hash(process.env.ADMIN_PASSWORD ?? 'change-me-strong', 12)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      name: process.env.ADMIN_NAME ?? 'Dr. Admin',
      branchId,
      active: true,
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: process.env.ADMIN_NAME ?? 'Dr. Admin',
      role: 'ADMIN',
      branchId,
    },
  })
  users[adminEmail] = admin

  await prisma.session.deleteMany({
    where: { userId: { in: Object.values(users).map((u) => u.id) } },
  })

  const receptionistId = users['yasmine@dentora.dz'].id
  const accountantId = users['nadia@dentora.dz'].id
  const dentists = [users['karim@dentora.dz'].id, users['amel@dentora.dz'].id]

  const scheduleRows: Array<{
    staffId: string
    weekday: string
    startTime: string
    endTime: string
    active: boolean
  }> = []
  const weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const
  const template = (id: string, days: ReadonlyArray<readonly [string, string, string]>) => {
    for (const [weekday, startTime, endTime] of days) {
      scheduleRows.push({ staffId: id, weekday, startTime, endTime, active: true })
    }
  }
  template(
    dentists[0],
    weekDays.map((d) => [d, '08:30', '16:30'] as const),
  )
  template(dentists[1], [
    ['MONDAY', '09:00', '17:00'],
    ['TUESDAY', '09:00', '17:00'],
    ['THURSDAY', '13:00', '19:00'],
    ['FRIDAY', '09:00', '13:00'],
  ])
  template(
    users['yasmine@dentora.dz'].id,
    weekDays.map((d) => [d, '09:00', '17:00'] as const),
  )
  template(users['sofiane@dentora.dz'].id, [
    ['MONDAY', '09:00', '14:00'],
    ['WEDNESDAY', '09:00', '17:00'],
    ['FRIDAY', '09:00', '14:00'],
  ])
  template(users['nadia@dentora.dz'].id, [
    ['MONDAY', '08:00', '16:00'],
    ['TUESDAY', '08:00', '16:00'],
    ['WEDNESDAY', '08:00', '16:00'],
    ['THURSDAY', '08:00', '16:00'],
    ['FRIDAY', '08:00', '16:00'],
  ])
  template(users['rayan@dentora.dz'].id, [
    ['MONDAY', '09:00', '15:00'],
    ['TUESDAY', '09:00', '15:00'],
    ['THURSDAY', '09:00', '15:00'],
  ])
  await prisma.staffSchedule.createMany({
    data: scheduleRows.map((r) => ({ branchId, ...r })),
  })

  const attendanceDays: Date[] = []
  const cursor = new Date()
  while (attendanceDays.length < 10) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) attendanceDays.push(new Date(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  attendanceDays.reverse()

  const dayTimes: Record<string, readonly [number, number]> = {
    [users['karim@dentora.dz'].id]: [8, 30],
    [users['amel@dentora.dz'].id]: [9, 0],
    [users['yasmine@dentora.dz'].id]: [9, 0],
    [users['sofiane@dentora.dz'].id]: [9, 0],
    [users['nadia@dentora.dz'].id]: [8, 0],
    [users['rayan@dentora.dz'].id]: [9, 0],
  }
  const attendanceRows = []
  for (const staffId of Object.keys(dayTimes)) {
    const [startH, startM] = dayTimes[staffId]
    for (const day of attendanceDays) {
      const checkIn = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, startM, 0)
      const endH = staffId === users['nadia@dentora.dz'].id ? 16 : 17
      const checkOut = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endH, 0, 0)
      attendanceRows.push({
        branchId,
        staffId,
        date: day,
        checkIn,
        checkOut,
        createdById: users[adminEmail].id,
      })
    }
  }
  await prisma.attendanceLog.createMany({ data: attendanceRows })

  const internStart = new Date()
  internStart.setDate(internStart.getDate() - 45)
  await prisma.internProfile.create({
    data: {
      branchId,
      internId: users['rayan@dentora.dz'].id,
      school: process.env.INTERN_SCHOOL ?? 'Université d’Alger',
      requiredHours: 200,
      rotation: 'CARE',
      mentorId: users['karim@dentora.dz'].id,
      startDate: internStart,
      active: true,
    },
  })

  const payrollFrom = dateOnly(30)
  const payrollTo = dateOnly(1)
  // Paid staff profile: senior dentist + junior dentist + accountant +
  // receptionist. Worked minutes are derived from the attendance logs seeded
  // above (the two dentists and receptionist all worked within this window).
  await prisma.payslip.createMany({
    data: [
      {
        branchId,
        staffId: dentists[0],
        periodStart: payrollFrom,
        periodEnd: payrollTo,
        baseDZD: 220000,
        bonusDZD: 20000,
        deductionsDZD: 5000,
        notes: 'Mois complet',
        createdById: users[adminEmail].id,
      },
      {
        branchId,
        staffId: dentists[1],
        periodStart: payrollFrom,
        periodEnd: payrollTo,
        baseDZD: 190000,
        bonusDZD: 10000,
        deductionsDZD: 0,
        notes: null,
        createdById: users[adminEmail].id,
      },
      {
        branchId,
        staffId: users['nadia@dentora.dz'].id,
        periodStart: payrollFrom,
        periodEnd: payrollTo,
        baseDZD: 160000,
        bonusDZD: 0,
        deductionsDZD: 0,
        notes: null,
        createdById: users[adminEmail].id,
      },
      {
        branchId,
        staffId: users['yasmine@dentora.dz'].id,
        periodStart: payrollFrom,
        periodEnd: payrollTo,
        baseDZD: 150000,
        bonusDZD: 5000,
        deductionsDZD: 2000,
        notes: null,
        createdById: users[adminEmail].id,
      },
    ],
  })

  const services = []
  for (const s of SERVICES) {
    services.push(
      await prisma.service.create({
        data: {
          branchId,
          name: s.name,
          category: s.category,
          priceDZD: s.priceDZD,
          durationMinutes: s.durationMinutes,
          reimbursablePct: s.reimbursablePct,
        },
      }),
    )
  }

  const patients = []
  for (const p of PATIENTS) {
    const created = await prisma.patient.create({
      data: {
        branchId,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender,
        birthDate: new Date(`${p.birthDate}T00:00:00`),
        phone: p.phone,
        email: p.email ?? null,
        address: p.address,
        notes: p.notes ? encrypt(p.notes) : null,
        archivedAt: p.archived ? dateOnly(90) : null,
        createdAt:
          p.createdAtDaysAgo !== undefined ? dateOnly(p.createdAtDaysAgo, 9, 15) : new Date(),
      },
    })
    if (p.medical) {
      await prisma.patientMedicalHistory.create({
        data: { patientId: created.id, data: encrypt(JSON.stringify(p.medical)), version: 1 },
      })
    }
    if (p.odontogram) {
      const teeth: Record<string, { status: string; surfaces: Record<string, string[]> }> = {}
      for (const [tooth, t] of Object.entries(p.odontogram)) {
        teeth[tooth] = {
          status: t.status,
          surfaces: {
            m: t.surfaces.m ?? [],
            d: t.surfaces.d ?? [],
            o: t.surfaces.o ?? [],
            b: t.surfaces.b ?? [],
            l: t.surfaces.l ?? [],
          },
        }
      }
      await prisma.patientOdontogram.create({
        data: { patientId: created.id, data: encrypt(JSON.stringify({ teeth })), version: 1 },
      })
    }
    patients.push(created)
  }

  const demoPortal = patients[0]
  if (demoPortal?.email) {
    await prisma.user.upsert({
      where: { email: demoPortal.email },
      update: {
        passwordHash,
        role: 'PATIENT',
        branchId: demoPortal.branchId,
        active: true,
        name: `${demoPortal.firstName} ${demoPortal.lastName}`.trim(),
        patientId: demoPortal.id,
      },
      create: {
        email: demoPortal.email,
        passwordHash,
        name: `${demoPortal.firstName} ${demoPortal.lastName}`.trim(),
        role: 'PATIENT',
        branchId: demoPortal.branchId,
        active: true,
        patientId: demoPortal.id,
      },
    })
  }

  const appointments = []
  for (const a of APPOINTMENTS) {
    const created = await prisma.appointment.create({
      data: {
        branchId,
        patientId: patients[a.patientIndex].id,
        dentistId: dentists[a.dentistIndex],
        startAt: day(a.start.day, a.start.hour, a.start.min),
        endAt: day(a.end.day, a.end.hour, a.end.min),
        status: a.status,
        notes: a.notes ? encrypt(a.notes) : null,
        createdById: receptionistId,
      },
    })
    appointments.push(created)
  }

  for (const w of WAITLIST) {
    await prisma.waitlistEntry.create({
      data: {
        branchId,
        patientId: patients[w.patientIndex].id,
        dentistId: dentists[0],
        preferredDate:
          w.preferredDaysAgo !== undefined ? dateOnly(-w.preferredDaysAgo, 10, 0) : null,
        notes: w.notes ? encrypt(w.notes) : null,
        status: w.status,
        appointmentId:
          w.appointmentIndex !== undefined ? appointments[w.appointmentIndex].id : null,
        createdById: receptionistId,
      },
    })
  }

  let invoiceNumber = 0
  for (const inv of INVOICES) {
    invoiceNumber += 1
    const issuedAt = dateOnly(inv.daysAgo, 11, 30)
    const created = await prisma.invoice.create({
      data: {
        branchId,
        patientId: patients[inv.patientIndex].id,
        invoiceNumber,
        issuedAt,
        voidedAt: inv.voided ? issuedAt : null,
        createdById: receptionistId,
        lines: {
          create: inv.lines.map((l) => {
            const svc = services[l.serviceIndex]
            return {
              serviceId: svc.id,
              serviceName: svc.name,
              priceDZD: l.priceDZD ?? svc.priceDZD,
              quantity: l.quantity,
            }
          }),
        },
      },
    })
    for (const pay of inv.payments) {
      const receipt = await prisma.payment.create({
        data: {
          branchId,
          invoiceId: created.id,
          kind: 'RECEIPT',
          method: pay.method,
          amountDZD: pay.amountDZD,
          reference: `REC-${invoiceNumber}-${pay.daysAgo}`,
          receivedAt: dateOnly(pay.daysAgo, 12, 0),
          createdById: receptionistId,
        },
      })
      if (pay.refund !== undefined && pay.refund > 0) {
        await prisma.payment.create({
          data: {
            branchId,
            invoiceId: created.id,
            kind: 'REFUND',
            method: pay.method,
            amountDZD: pay.refund,
            reference: `REF-${invoiceNumber}`,
            receivedAt: dateOnly(Math.max(0, pay.daysAgo - 1), 13, 0),
            refundsId: receipt.id,
            createdById: receptionistId,
          },
        })
      }
    }
  }
  await prisma.setting.upsert({
    where: { branchId_key: { branchId, key: 'invoiceCounter' } },
    create: { branchId, key: 'invoiceCounter', value: String(invoiceNumber) },
    update: { value: String(invoiceNumber) },
  })

  for (const e of EXPENSES) {
    await prisma.expense.create({
      data: {
        branchId,
        category: e.category,
        amountDZD: e.amountDZD,
        description: e.description,
        incurredAt: dateOnly(e.daysAgo, 9, 0),
        voidedAt: e.voided ? dateOnly(e.daysAgo, 9, 0) : null,
        createdById: accountantId,
      },
    })
  }

  const productsById = new Map<string, string>()
  for (const p of PRODUCTS) {
    const created = await prisma.product.create({
      data: {
        branchId,
        name: p.name,
        code: p.code,
        category: p.category,
        unit: p.unit,
        reorderLevel: p.reorderLevel,
        quantityOnHand: p.quantityOnHand,
        archivedAt: p.archived ? dateOnly(60) : null,
        createdById: accountantId,
      },
    })
    productsById.set(p.code, created.id)
  }

  const suppliers = []
  for (const s of SUPPLIERS) {
    suppliers.push(
      await prisma.supplier.create({
        data: {
          branchId,
          name: s.name,
          phone: s.phone,
          email: s.email ?? null,
          address: s.address,
          createdById: accountantId,
        },
      }),
    )
  }

  const poByReference = new Map<
    string,
    {
      id: string
      lines: Array<{ id: string; productId: string; quantity: number; receivedQuantity: number }>
    }
  >()
  for (const po of PURCHASE_ORDERS) {
    const created = await prisma.purchaseOrder.create({
      data: {
        branchId,
        supplierId: suppliers[po.supplierIndex].id,
        reference: po.reference,
        notes: po.notes ?? null,
        status: po.status,
        orderedAt: dateOnly(po.orderedDaysAgo, 10, 0),
        receivedAt: po.receivedDaysAgo !== undefined ? dateOnly(po.receivedDaysAgo, 15, 0) : null,
        createdById: accountantId,
        lines: {
          create: po.lines.map((l) => ({
            productId: productsById.get(PRODUCTS[l.productIndex].code)!,
            productName: PRODUCTS[l.productIndex].name,
            unit: PRODUCTS[l.productIndex].unit,
            unitPriceDZD: l.unitPriceDZD,
            quantity: l.quantity,
            receivedQuantity: l.receivedQuantity ?? 0,
          })),
        },
      },
      include: { lines: true },
    })
    poByReference.set(po.reference, { id: created.id, lines: created.lines })
  }

  for (const [code, rows] of Object.entries(STOCK_LEDGER)) {
    const productId = productsById.get(code)!
    for (const row of rows) {
      let purchaseOrderId: string | null = null
      let unitCostDZD: number | null = null
      if (row.type === 'IN') {
        const po = [...poByReference.values()].find((p) =>
          p.lines.some((l) => l.productId === productId && l.receivedQuantity > 0),
        )
        if (po) {
          purchaseOrderId = po.id
          unitCostDZD = po.lines.find((l) => l.productId === productId)!.unitPriceDZD
        }
      }
      await prisma.stockLedgerEntry.create({
        data: {
          branchId,
          productId,
          type: row.type,
          quantity: Math.abs(row.quantity),
          unitCostDZD,
          batch: row.batch ?? null,
          expiryDate: row.expiryDays !== undefined ? day(row.expiryDays, 0, 0) : null,
          reason: row.reason ?? null,
          purchaseOrderId,
          createdById: accountantId,
          createdAt: row.daysAgo !== undefined ? dateOnly(row.daysAgo, 11, 0) : new Date(),
        },
      })
    }
  }

  for (const c of CONSUMPTIONS) {
    const productId = productsById.get(PRODUCTS[c.productIndex].code)!
    await prisma.product.update({
      where: { id: productId },
      data: { quantityOnHand: { decrement: c.quantity } },
    })
    await prisma.stockLedgerEntry.create({
      data: {
        branchId,
        productId,
        type: 'OUT',
        quantity: c.quantity,
        batch: c.batch ?? null,
        reason: c.reason ?? null,
        appointmentId: appointments[c.appointmentIndex].id,
        createdById: dentists[c.dentistIndex],
        createdAt: appointments[c.appointmentIndex].startAt,
      },
    })
    await prisma.treatmentStockConsumption.create({
      data: {
        branchId,
        appointmentId: appointments[c.appointmentIndex].id,
        productId,
        quantity: c.quantity,
        batch: c.batch ?? null,
        reason: c.reason ?? null,
        consumedAt: appointments[c.appointmentIndex].startAt,
        createdById: dentists[c.dentistIndex],
      },
    })
  }

  for (const s of STERILIZATIONS) {
    await prisma.sterilizationLog.create({
      data: {
        branchId,
        productId:
          s.productIndex !== undefined ? productsById.get(PRODUCTS[s.productIndex].code)! : null,
        instrument: s.instrument,
        method: s.method,
        cycle: s.cycle ?? null,
        status: s.status,
        startedAt: new Date(Date.now() - s.startedMinutesAgo * 60_000),
        completedAt:
          s.completedMinutesAgo !== undefined
            ? new Date(Date.now() - s.completedMinutesAgo * 60_000)
            : null,
        operatorId: s.operatorIndex !== undefined ? dentists[s.operatorIndex] : null,
        notes: s.notes ?? null,
        createdById: s.operatorIndex !== undefined ? dentists[s.operatorIndex] : null,
      },
    })
  }

  const ledgerCount = await prisma.stockLedgerEntry.count({ where: { branchId } })
  const invariantCheck = await prisma.product.findMany({ where: { branchId } })
  let invariantOk = true
  for (const p of invariantCheck) {
    const rows = await prisma.stockLedgerEntry.findMany({
      where: { productId: p.id },
      select: { type: true, quantity: true },
    })
    const ledgerSum = rows.reduce(
      (sum, r) =>
        sum +
        (r.type === 'OPENING' || r.type === 'IN'
          ? r.quantity
          : r.type === 'ADJUST'
            ? r.quantity
            : -r.quantity),
      0,
    )
    if (ledgerSum !== p.quantityOnHand) {
      invariantOk = false
      console.warn(
        `INVARIANT VIOLATION ${p.code}: ledger ${ledgerSum} != on-hand ${p.quantityOnHand}`,
      )
    }
  }

  const counts = {
    users: await prisma.user.count({ where: { branchId } }),
    patients: await prisma.patient.count({ where: { branchId } }),
    services: await prisma.service.count({ where: { branchId } }),
    appointments: await prisma.appointment.count({ where: { branchId } }),
    waitlist: await prisma.waitlistEntry.count({ where: { branchId } }),
    invoices: await prisma.invoice.count({ where: { branchId } }),
    payments: await prisma.payment.count({ where: { branchId } }),
    expenses: await prisma.expense.count({ where: { branchId } }),
    products: await prisma.product.count({ where: { branchId } }),
    suppliers: await prisma.supplier.count({ where: { branchId } }),
    purchaseOrders: await prisma.purchaseOrder.count({ where: { branchId } }),
    ledger: ledgerCount,
    consumptions: await prisma.treatmentStockConsumption.count({ where: { branchId } }),
    sterilizations: await prisma.sterilizationLog.count({ where: { branchId } }),
    schedules: await prisma.staffSchedule.count({ where: { branchId } }),
    attendance: await prisma.attendanceLog.count({ where: { branchId } }),
    interns: await prisma.internProfile.count({ where: { branchId } }),
    payslips: await prisma.payslip.count({ where: { branchId } }),
  }

  console.log(`demo seed ready on branch "${branchName}"`)
  console.log(JSON.stringify(counts, null, 2))
  console.log(`invariant Σ ledger == quantityOnHand: ${invariantOk ? 'OK' : 'FAILED'}`)
  console.log(`demo logins (password: ${DEMO_PASSWORD}):`)
  for (const s of STAFF) console.log(`  ${s.role.padEnd(11)} ${s.email}`)
  console.log(`  ADMIN       ${adminEmail}`)
  if (!invariantOk) process.exitCode = 1
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
