import 'dotenv/config'
import { hash } from 'bcryptjs'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

  const branchName = process.env.BRANCH_NAME ?? 'Dentora Algiers'
  const branch =
    (await prisma.branch.findFirst({ where: { name: branchName } })) ??
    (await prisma.branch.create({ data: { name: branchName } }))

  const email = (process.env.ADMIN_EMAIL ?? 'admin@dentora.dz').toLowerCase()
  const password = process.env.ADMIN_PASSWORD ?? 'change-me-strong'
  const name = process.env.ADMIN_NAME ?? 'Dr. Admin'
  const passwordHash = await hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: 'ADMIN', branchId: branch.id, active: true },
    create: { email, passwordHash, name, role: 'ADMIN', branchId: branch.id },
  })

  console.log(`seeded branch "${branch.name}" (${branch.id})`)
  console.log(`seeded admin "${admin.email}" (role=ADMIN)`)
  void prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
