import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  // Only director and accounts can see all payments
  if (!['director', 'accounts'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === 'true'

  if (all) {
    const payments = await prisma.payment.findMany({
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

  const { paymentMode, utrNumber, bankAccount, ...rest } = body

  const payment = await prisma.payment.create({
    data: {
      ...rest,
      ...(paymentMode ? { paymentMode } : {}),
      ...(utrNumber ? { utrNumber } : {}),
      ...(bankAccount ? { bankAccount } : {}),
    }
  })

  // Log activity
  await prisma.activity.create({
    data: {
      dealId: body.dealId,
      userId: user.id,
      type: 'payment',
      content: `Payment received — ₹${body.amount.toLocaleString('en-IN')} (${body.type})${paymentMode ? ` via ${paymentMode}` : ''}${utrNumber ? ` Ref: ${utrNumber}` : ''}`,
    }
  })

  // Auto-update deal advance/balance flags
  if (body.type === 'advance') {
    await prisma.deal.update({
      where: { id: body.dealId },
      data: { advanceReceived: true, advanceDate: new Date(body.date) }
    })

    // Get deal to check advanceDeadline
    const deal = await prisma.deal.findUnique({ where: { id: body.dealId }, select: { advanceDeadline: true, customerName: true } })

    // Create advance payment activity if advanceDeadline set
    if (deal?.advanceDeadline) {
      await prisma.activity.create({
        data: {
          dealId: payment.dealId,
          userId: user.id,
          type: 'payment',
          content: `Advance payment of ₹${payment.amount.toLocaleString('en-IN')} received via ${paymentMode || 'N/A'} (Ref: ${utrNumber || 'N/A'})`,
        }
      })
    }

    // Create follow-up task for accounts if no existing one
    const accountsUser = await prisma.user.findFirst({ where: { role: 'accounts' } })
    if (accountsUser) {
      const existingTask = await prisma.task.findFirst({
        where: {
          dealId: body.dealId,
          assignedToId: accountsUser.id,
          title: { contains: 'Follow up on advance payment' },
          status: 'pending',
        }
      })
      if (!existingTask) {
        const deal2 = await prisma.deal.findUnique({ where: { id: body.dealId }, select: { advanceDeadline: true, customerName: true } })
        const dueDate = deal2?.advanceDeadline
          ? new Date(deal2.advanceDeadline)
          : (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d })()
        await prisma.task.create({
          data: {
            dealId: body.dealId,
            title: `Follow up on advance payment — ${deal2?.customerName || ''}`,
            dueDate,
            type: 'follow_up',
            assignedToId: accountsUser.id,
            createdById: user.id,
          }
        })
      }
    }
  } else if (body.type === 'balance') {
    await prisma.deal.update({
      where: { id: body.dealId },
      data: { balancePaid: true, balanceDate: new Date(body.date) }
    })
  }

  return NextResponse.json(payment)
}
