import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  if (!['director', 'accounts'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === 'true'
  const dealId = searchParams.get('dealId')

  if (all || dealId) {
    const payments = await prisma.payment.findMany({
      where: dealId ? { dealId } : undefined,
      include: {
        deal: { select: { id: true, dealNumber: true, customerName: true, customerCompany: true } }
      },
      orderBy: { date: 'desc' }
    })
    return NextResponse.json(payments)
  }

  return NextResponse.json([])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any
  const body = await req.json()

  const { paymentMode, utrNumber, bankAccount, scheduledDate, received, ...rest } = body

  const payment = await prisma.payment.create({
    data: {
      ...rest,
      ...(paymentMode ? { paymentMode } : {}),
      ...(utrNumber ? { utrNumber } : {}),
      ...(bankAccount ? { bankAccount } : {}),
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
      received: received !== false,
    }
  })

  const deal = await prisma.deal.findUnique({
    where: { id: body.dealId },
    select: { customerName: true, customerCompany: true, advanceDeadline: true }
  })

  const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })

  // Log activity for received payments
  if (received !== false) {
    await prisma.activity.create({
      data: {
        dealId: body.dealId,
        userId: user.id,
        type: 'payment',
        content: `Payment received — ₹${Number(body.amount).toLocaleString('en-IN')} (${body.type})${paymentMode ? ` via ${paymentMode}` : ''}${utrNumber ? ` · Ref: ${utrNumber}` : ''}`,
      }
    })

    // Update deal flags
    if (body.type === 'advance') {
      await prisma.deal.update({
        where: { id: body.dealId },
        data: { advanceReceived: true, advanceDate: new Date(body.date) }
      })
    } else if (body.type === 'balance') {
      await prisma.deal.update({
        where: { id: body.dealId },
        data: { balancePaid: true, balanceDate: new Date(body.date) }
      })
    }
  }

  // If scheduledDate set, create reminder tasks for accounts head 1 and 2 days before
  if (scheduledDate && accountsUser) {
    const sDate = new Date(scheduledDate)

    const oneDayBefore = new Date(sDate)
    oneDayBefore.setDate(oneDayBefore.getDate() - 1)

    const twoDaysBefore = new Date(sDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)

    const company = deal?.customerCompany || deal?.customerName || ''
    const typeLabel = body.type === 'advance' ? 'advance' : body.type === 'balance' ? 'balance' : 'payment'

    if (twoDaysBefore > new Date()) {
      await prisma.task.create({
        data: {
          dealId: body.dealId,
          title: `Reminder: ${typeLabel} of ₹${Number(body.amount).toLocaleString('en-IN')} due in 2 days — ${company}`,
          dueDate: twoDaysBefore,
          type: 'follow_up',
          assignedToId: accountsUser.id,
          createdById: user.id,
        }
      })
    }

    if (oneDayBefore > new Date()) {
      await prisma.task.create({
        data: {
          dealId: body.dealId,
          title: `Final reminder: ${typeLabel} of ₹${Number(body.amount).toLocaleString('en-IN')} due tomorrow — ${company}`,
          dueDate: oneDayBefore,
          type: 'follow_up',
          assignedToId: accountsUser.id,
          createdById: user.id,
        }
      })
    }

    // Task on due date itself
    await prisma.task.create({
      data: {
        dealId: body.dealId,
        title: `Collect ${typeLabel} payment of ₹${Number(body.amount).toLocaleString('en-IN')} — ${company}`,
        dueDate: sDate,
        type: 'follow_up',
        assignedToId: accountsUser.id,
        createdById: user.id,
      }
    })
  }

  return NextResponse.json(payment)
}
