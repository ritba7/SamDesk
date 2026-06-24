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

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (apiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 300,
          system: "You are a sales assistant for SAM PRODUCTS Pvt. Ltd., manufacturers of Air Showers and Cleanroom solutions. Write a SHORT professional introduction email (3-4 sentences, no more than 100 words). It should: introduce SAM PRODUCTS briefly, acknowledge the customer's requirement, mention that TDS/specs document is being shared, and invite them to discuss further. Sign off as 'Team SAM PRODUCTS'. Do not include subject line, filler phrases, or long paragraphs.",
          messages: [
            {
              role: 'user',
              content: `Write a short intro email for:
Customer: ${customerName || "Sir/Ma'am"}
Company: ${customerCompany || 'their organisation'}
Product: ${product}
${querySummary ? `Requirement: ${querySummary}` : ''}
${timeline === 'urgent' ? 'Note: Requirement is urgent.' : ''}`
            }
          ]
        })
      })

      if (response.ok) {
        const data = await response.json()
        const emailText = data.content?.[0]?.text || ''
        if (emailText) return NextResponse.json({ email: emailText })
      }
    } catch {
      // Fall through to template
    }
  }

  // Fallback template
  const urgentNote = timeline === 'urgent' ? '\n\nWe note that your requirement is urgent and assure you of priority attention.' : ''
  const email = `Dear ${customerName || "Sir/Ma'am"},

Thank you for your enquiry regarding ${product}s. SAM PRODUCTS Pvt. Ltd. has been manufacturing premium Air Showers and Cleanroom solutions since 1992, serving clients across pharma, electronics, and defence sectors. Please find our TDS and product specifications attached for your review.${urgentNote} We would be glad to schedule a call and discuss your specific requirements.

Team SAM PRODUCTS
SAM PRODUCTS Pvt. Ltd. | +91-9810065139 | samproducts1992@gmail.com`

  return NextResponse.json({ email })
}
