import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const { searchParams } = new URL(req.url)
  const assignedTo = searchParams.get('assignedTo')
  const all = searchParams.get('all')

  const where: any = {}
  if (!all) where.status = 'pending'
  if (assignedTo) where.assignedToId = assignedTo
  else if (user.role === 'sales_director' && all) {
    // Sales director sees all sales-team tasks
    where.assignedTo = { role: { in: ['sales', 'sales_director'] } }
  }
  else if (user.role !== 'director') where.assignedToId = user.id

  const tasks = await prisma.task.findMany({
    where,
    include: {
      deal: { select: { dealNumber: true, customerName: true } },
      assignedTo: { select: { name: true, role: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const body = await req.json()

  // A salesman may only create tasks assigned to himself. Any other assignee is overridden.
  // Leadership / vp / accounts may assign to others.
  const canAssignOthers = ['director', 'sales_director', 'vp', 'accounts'].includes(user.role)
  const assignedToId = canAssignOthers ? (body.assignedToId || user.id) : user.id

  const task = await prisma.task.create({
    data: { ...body, assignedToId, createdById: user.id }
  })

  return NextResponse.json(task)
}
