// One-time account seeder for SamDesk (run locally against the Neon DB).
//   Usage (PowerShell, from the repo root):
//     $env:DATABASE_URL="<your neon connection string>"; node seed-once.mjs
// Idempotent — existing accounts are skipped, only missing ones are created.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

const users = [
  { name: 'Director', email: 'director@samdesk.in', password: 'Director@123', role: 'director' },
  { name: 'VP Assistant', email: 'vp@samdesk.in', password: 'VP@123456', role: 'vp' },
  { name: 'Accounts Head', email: 'accounts@samdesk.in', password: 'Accounts@123', role: 'accounts' },
  { name: 'Manufacturing Head', email: 'mfg@samdesk.in', password: 'Mfg@123456', role: 'manufacturing' },
  { name: 'Design Head', email: 'design@samdesk.in', password: 'Design@123', role: 'design' },
  { name: 'Sales Executive', email: 'sales@samdesk.in', password: 'Sales@123', role: 'sales' },
  { name: 'Sales Director', email: 'salesdirector@samdesk.in', password: 'SalesDir@123', role: 'sales_director' },
  ...[1, 2, 3, 4, 5, 6].map(n => ({
    name: `Sales Executive ${n}`, email: `sales${n}@samdesk.in`, password: `Sales${n}@123`, role: 'sales',
  })),
]

for (const u of users) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } })
  if (!existing) {
    await prisma.user.create({ data: { ...u, password: await bcrypt.hash(u.password, 10) } })
    console.log('Created:', u.email, '(' + u.role + ')')
  } else {
    console.log('Exists :', u.email)
  }
}
await prisma.$disconnect()
console.log('DONE — all accounts ready.')
