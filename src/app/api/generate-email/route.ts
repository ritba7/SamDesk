import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { customerName, customerCompany, productInterest, querySummary, timeline } = body

  const product = productInterest === 'air_curtain' ? 'Air Curtain'
    : productInterest === 'clean_room' ? 'Clean Room Solution'
    : productInterest === 'other' ? 'Product'
    : 'Air Shower'

  const email = `Subject: Re: Enquiry for ${product} – SAM PRODUCTS Pvt. Ltd.

Dear ${customerName || "Sir/Ma'am"},

Thank you for reaching out to SAM PRODUCTS Pvt. Ltd.${querySummary ? ` We are pleased to receive your enquiry regarding ${querySummary}.` : '.'}

We have been manufacturing high-quality Air Showers, Air Curtains, and Clean Room solutions since 1992, supplying to leading companies across pharmaceuticals, electronics, food processing, and defence sectors pan-India.

As a first step, please find attached:
1. Company Profile – SAM PRODUCTS Pvt. Ltd.
2. Product Brochure – ${product}s & Clean Room Solutions
3. Customer Reference List (partial)

To help us prepare a suitable technical proposal, we request you to share:
• Required dimensions (Length × Width × Height in mm)
• Material preference (MS / SS 304 / SS 202)
• Number of persons to use the Air Shower simultaneously
• Any specific technical or compliance requirements${timeline === 'urgent' ? '\n\nWe note that your requirement is urgent and assure you of our priority attention.' : ''}

We would also be happy to schedule a call at your convenience to understand your requirement better and walk you through our product range.

We look forward to the opportunity to work with ${customerCompany || 'your organisation'}.

Warm Regards,

[Your Name]
SAM PRODUCTS Pvt. Ltd.
B-137, Noida Rd, B Block, Sector 6, Noida – 201 301, U.P., INDIA
Ph: +91-9810065139 | Email: samproducts1992@gmail.com
Web: www.samproducts.net | GSTIN: 09AAKCS6327D1Z8`

  return NextResponse.json({ email })
}
