import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

  const where: any = { status: 'pending' }
  if (user.role !== 'director') where.assignedToId = user.id

  const tasks = await prisma.task.findMany({
    where: { ...where, dueDate: { not: null } },
    include: {
      deal: { select: { dealNumber: true, customerName: true } },
      assignedTo: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' }
  })

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < today)
  const dueToday = tasks.filter(t => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    return d >= today && d < tomorrow
  })
  const dueTomorrow = tasks.filter(t => {
    if (!t.dueDate) return false
    const d = new Date(t.dueDate)
    return d >= tomorrow && d < dayAfterTomorrow
  })

  return NextResponse.json({ overdue, dueToday, dueTomorrow, total: overdue.length + dueToday.length })
}
