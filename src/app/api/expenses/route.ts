import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['director', 'accounts'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['director', 'accounts'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const expense = await prisma.expense.create({
    data: {
      category: body.category,
      amount: Number(body.amount),
      date: new Date(body.date),
      ...(body.dealId ? { dealId: body.dealId } : {}),
      ...(body.vendorName ? { vendorName: body.vendorName } : {}),
      ...(body.utrNumber ? { utrNumber: body.utrNumber } : {}),
      ...(body.paymentMode ? { paymentMode: body.paymentMode } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
    }
  })
  return NextResponse.json(expense)
}
