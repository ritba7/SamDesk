import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Only the Director may change passwords. The Director can change their own
// password (requires currentPassword) or reset any team member's password
// (pass targetUserId — no currentPassword required).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = session.user as any
  if (user.role !== 'director') {
    return NextResponse.json({ error: 'Only the Director can change passwords. Please contact the Director.' }, { status: 403 })
  }

  const { currentPassword, newPassword, targetUserId } = await req.json()

  if (!newPassword) {
    return NextResponse.json({ error: 'New password is required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  // Director resetting another user's password — no currentPassword needed
  if (targetUserId && targetUserId !== user.id) {
    const target = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: await bcrypt.hash(newPassword, 10) },
    })
    return NextResponse.json({ message: `Password reset for ${target.name}` })
  }

  // Director changing own password
  if (!currentPassword) {
    return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, dbUser.password)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  })

  return NextResponse.json({ message: 'Password updated successfully' })
}
