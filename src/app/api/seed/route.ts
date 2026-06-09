import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST() {
  const users = [
    { name: 'Director', email: 'director@samdesk.in', password: 'Director@123', role: 'director' },
    { name: 'VP Assistant', email: 'vp@samdesk.in', password: 'VP@123456', role: 'vp' },
    { name: 'Accounts Head', email: 'accounts@samdesk.in', password: 'Accounts@123', role: 'accounts' },
    { name: 'Manufacturing Head', email: 'mfg@samdesk.in', password: 'Mfg@123456', role: 'manufacturing' },
    { name: 'Design Head', email: 'design@samdesk.in', password: 'Design@123', role: 'design' },
  ]

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      await prisma.user.create({
        data: { ...u, password: await bcrypt.hash(u.password, 10) }
      })
    }
  }

  return NextResponse.json({ message: 'Users seeded successfully' })
}
