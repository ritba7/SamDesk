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
  const paid = body.paid !== false

  const expense = await prisma.expense.create({
    data: {
      category: body.category,
      amount: Number(body.amount),
      date: new Date(body.date),
      paid,
      ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
      ...(body.dealId ? { dealId: body.dealId } : {}),
      ...(body.vendorName ? { vendorName: body.vendorName } : {}),
      ...(body.utrNumber ? { utrNumber: body.utrNumber } : {}),
      ...(body.paymentMode ? { paymentMode: body.paymentMode } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
    }
  })

  // If scheduled (not yet paid) with a due date, create reminders for accounts head
  if (!paid && body.dueDate) {
    const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })
    if (accountsUser) {
      const dDate = new Date(body.dueDate)
      const oneDayBefore = new Date(dDate); oneDayBefore.setDate(oneDayBefore.getDate() - 1)
      const twoDaysBefore = new Date(dDate); twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
      const payee = body.vendorName || body.category
      const amt = Number(body.amount).toLocaleString('en-IN')

      if (twoDaysBefore > new Date()) {
        await prisma.task.create({
          data: { title: `Reminder: pay ₹${amt} to ${payee} in 2 days`, dueDate: twoDaysBefore, type: 'follow_up', assignedToId: accountsUser.id, createdById: user.id }
        })
      }
      if (oneDayBefore > new Date()) {
        await prisma.task.create({
          data: { title: `Final reminder: pay ₹${amt} to ${payee} tomorrow`, dueDate: oneDayBefore, type: 'follow_up', assignedToId: accountsUser.id, createdById: user.id }
        })
      }
      await prisma.task.create({
        data: { title: `Pay ₹${amt} to ${payee} (due today)`, dueDate: dDate, type: 'follow_up', assignedToId: accountsUser.id, createdById: user.id }
      })
    }
  }

  return NextResponse.json(expense)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  if (!['director', 'accounts'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const data: any = { ...rest }
  if (rest.date) data.date = new Date(rest.date)
  if (rest.dueDate) data.dueDate = new Date(rest.dueDate)

  const expense = await prisma.expense.update({ where: { id }, data })
  return NextResponse.json(expense)
}
