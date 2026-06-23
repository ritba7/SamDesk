import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gstin = searchParams.get('gstin')

  if (!gstin || gstin.length !== 15) {
    return NextResponse.json({ error: 'Invalid GSTIN' }, { status: 400 })
  }

  const stateCode = gstin.substring(0, 2)
  const stateCodes: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
    '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
  }

  // Try live GST API
  try {
    const res = await fetch(`https://api.gst.gov.in/commonapi/v1.1/search?action=TP&gstin=${gstin}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        valid: true,
        legalName: data.lgnm || '',
        tradeName: data.tradeNam || '',
        state: data.pradr?.addr?.stcd || stateCodes[stateCode] || '',
        status: data.sts || 'Active',
        registrationDate: data.rgdt || '',
        businessType: data.ctb || '',
        fromLive: true
      })
    }
  } catch {}

  // Fallback: parse from GSTIN format
  return NextResponse.json({
    valid: true,
    legalName: '',
    state: stateCodes[stateCode] || 'Unknown',
    status: 'Format valid – live check unavailable',
    fromFormat: true,
    pan: gstin.substring(2, 12)
  })
}
