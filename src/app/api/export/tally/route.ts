import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const [deals, payments] = await Promise.all([
    prisma.deal.findMany({
      where: {
        stage: { in: ['pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched', 'feedback_pending', 'closed_won'] },
        updatedAt: { gte: startDate, lte: endDate }
      },
      include: { payments: true }
    }),
    prisma.payment.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { deal: { select: { dealNumber: true, customerName: true, customerCompany: true } } }
    })
  ])

  const wb = XLSX.utils.book_new()

  // Sheet 1: Invoices
  const invoiceData = deals.map(d => ({
    'Deal Number': d.dealNumber,
    'Customer Name': d.customerName,
    'Company': d.customerCompany,
    'Customer State': d.customerState || '',
    'Invoice Amount': d.quotedAmount || 0,
    'GST Type': d.customerState === 'Uttar Pradesh' ? 'CGST+SGST' : 'IGST',
    'CGST (9%)': d.customerState === 'Uttar Pradesh' ? Math.round((d.quotedAmount || 0) * 0.09) : 0,
    'SGST (9%)': d.customerState === 'Uttar Pradesh' ? Math.round((d.quotedAmount || 0) * 0.09) : 0,
    'IGST (18%)': d.customerState !== 'Uttar Pradesh' ? Math.round((d.quotedAmount || 0) * 0.18) : 0,
    'Total with GST': d.quotedAmount ? Math.round(d.quotedAmount * 1.18) : 0,
    'HSN Code': '84145930',
    'Stage': d.stage,
    'Advance Received': d.advanceReceived ? 'Yes' : 'No',
    'Balance Paid': d.balancePaid ? 'Yes' : 'No',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceData), 'Invoices')

  // Sheet 2: Payments
  const paymentData = payments.map(p => ({
    'Date': new Date(p.date).toLocaleDateString('en-IN'),
    'Deal Number': p.deal.dealNumber,
    'Customer': p.deal.customerName,
    'Company': p.deal.customerCompany,
    'Payment Type': p.type,
    'Amount': p.amount,
    'Notes': p.notes || '',
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentData), 'Payments')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="SamDesk_Tally_${year}_${String(month).padStart(2,'0')}.xlsx"`,
    }
  })
}
