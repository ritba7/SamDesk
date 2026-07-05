import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkAccess(user: any, dealId: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true, assignedToId: true, createdById: true, dealFinalized: true } })
  if (!deal) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  if (user.role === 'sales' && deal.assignedToId !== user.id && deal.createdById !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (user.role === 'accounts' && !deal.dealFinalized) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { deal }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const check = await checkAccess(session.user as any, params.id)
  if (check.error) return check.error

  const contacts = await prisma.contactPerson.findMany({
    where: { dealId: params.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const check = await checkAccess(session.user as any, params.id)
  if (check.error) return check.error

  const body = await req.json()
  // Accept either a single contact or an array of contacts
  const items = Array.isArray(body) ? body : Array.isArray(body?.contacts) ? body.contacts : [body]
  const created = []
  for (const c of items) {
    if (!c?.name || !String(c.name).trim()) continue
    created.push(await prisma.contactPerson.create({
      data: {
        dealId: params.id,
        name: String(c.name).trim(),
        phone: c.phone || null,
        email: c.email || null,
        designation: c.designation || null,
        isPrimary: !!c.isPrimary,
      }
    }))
  }
  return NextResponse.json(created)
}
