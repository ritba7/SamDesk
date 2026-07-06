import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Seeds the initial team accounts. Protected by SEED_SECRET so it cannot be
// triggered by anyone on the public internet.
//
// Passwords can be supplied via env vars (recommended for production):
//   DIRECTOR_PASSWORD, VP_PASSWORD, ACCOUNTS_PASSWORD, MFG_PASSWORD,
//   DESIGN_PASSWORD, SALES_PASSWORD
// If a var is not set, a default is used (change it after first login).

async function runSeed(req: NextRequest) {
  const seedSecret = process.env.SEED_SECRET
  const provided = new URL(req.url).searchParams.get('secret') || req.headers.get('x-seed-secret')

  // If a secret is configured, it must match. (If none configured — e.g. first
  // local run — the endpoint still works to avoid lockout, but in production you
  // MUST set SEED_SECRET.)
  if (seedSecret && provided !== seedSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const users = [
      { name: 'Director', email: 'director@samdesk.in', password: process.env.DIRECTOR_PASSWORD || 'Director@123', role: 'director' },
      { name: 'VP Assistant', email: 'vp@samdesk.in', password: process.env.VP_PASSWORD || 'VP@123456', role: 'vp' },
      { name: 'Accounts Head', email: 'accounts@samdesk.in', password: process.env.ACCOUNTS_PASSWORD || 'Accounts@123', role: 'accounts' },
      { name: 'Manufacturing Head', email: 'mfg@samdesk.in', password: process.env.MFG_PASSWORD || 'Mfg@123456', role: 'manufacturing' },
      { name: 'Design Head', email: 'design@samdesk.in', password: process.env.DESIGN_PASSWORD || 'Design@123', role: 'design' },
      { name: 'Sales Executive', email: 'sales@samdesk.in', password: process.env.SALES_PASSWORD || 'Sales@123', role: 'sales' },
      { name: 'Sales Director', email: 'salesdirector@samdesk.in', password: process.env.SALES_DIRECTOR_PASSWORD || 'SalesDir@123', role: 'sales_director' },
      ...([['Alpha', 1], ['Beta', 2], ['Gamma', 3], ['Delta', 4], ['Epsilon', 5], ['Zeta', 6]] as [string, number][]).map(([nm, n]) => ({
        name: `Sales — ${nm}`,
        email: `sales${n}@samdesk.in`,
        password: process.env[`SALES${n}_PASSWORD`] || `Sales${n}@123`,
        role: 'sales',
      })),
    ]

    for (const u of users) {
      const existing = await prisma.user.findUnique({ where: { email: u.email } })
      if (!existing) {
        await prisma.user.create({
          data: { ...u, password: await bcrypt.hash(u.password, 10) }
        })
      }
    }

    return NextResponse.json({ message: 'Users seeded successfully', count: users.length })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return runSeed(req)
}

export async function POST(req: NextRequest) {
  return runSeed(req)
}
