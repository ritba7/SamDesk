import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE: [number, number, number] = [0, 112, 192]
const DARK: [number, number, number] = [33, 33, 33]
const WHITE: [number, number, number] = [255, 255, 255]
const LIGHT_GRAY: [number, number, number] = [240, 243, 247]
const RED: [number, number, number] = [192, 0, 0]

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDateDDMMYYYY(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

// Quote No format SPPL/AS/<YYDDMM>
function quoteSerial(d: Date): string {
  const yy = String(d.getFullYear()).slice(2)
  return `${yy}${pad(d.getDate())}${pad(d.getMonth() + 1)}`
}

function inr(n: number): string {
  return `₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const CONFIG_MAP: Record<string, string> = {
  straight: 'Straight Entry Straight Exit',
  RE: 'Straight Entry Right Exit',
  LE: 'Left Exit',
  SR: 'Straight & Right Exit',
  SL: 'Straight & Left Exit',
  RL: 'Right & Left Exit',
}

const MATERIAL_MAP: Record<string, string> = {
  ms: 'Mild Steel Sheet, Powder Coated',
  ss202: 'Stainless Steel 202 Grade, 18 & 16G Thk',
  ss304: 'Stainless Steel 304 Grade, 18 & 16G Thk',
  ss316: 'Stainless Steel 316 Grade',
  ms_ss202: 'MS Outer + SS202 Inner',
  ms_ss304: 'MS Outer + SS304 Inner',
}

const DOOR_LEAD: Record<string, string> = {
  hinged: 'Hinged', sliding: 'Sliding', rollup: 'Roll-up', shutter: 'Shutter', pvc: 'PVC', air_curtain: 'Air Curtain',
}

const MOTOR_TYPE_MAP: Record<string, string> = { ie2: 'IE2', ie3: 'IE3', flame_proof: 'Flame Proof' }

export function generateQuote(deal: any): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 14
  const contentW = pageW - 2 * margin

  const today = new Date()
  const serial = quoteSerial(today)
  const quoteNum = `SPPL/AS/${serial}`

  // ---- Header ----
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 26, 'F')
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('SAM PRODUCTS (P) Ltd', margin, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('SINCE 1992', margin, 16)
  doc.setFontSize(7)
  doc.text('H-161, Site V, UPSIDA, Greater Noida 201310, U.P., INDIA', margin, 21)
  doc.text('Ph: 9810065139', pageW - margin, 8, { align: 'right' })
  doc.text('samproducts1992@gmail.com | samproducts25@gmail.com', pageW - margin, 13, { align: 'right' })
  doc.text('www.samproducts.net', pageW - margin, 18, { align: 'right' })
  doc.text('GSTIN: 09AAKCS6327D1Z8 | CIN: U51101UP2007PTC055433', pageW - margin, 23, { align: 'right' })

  let y = 32

  // Title bar
  doc.setFillColor(...LIGHT_GRAY)
  doc.rect(margin, y, contentW, 8, 'F')
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('QUOTATION', pageW / 2, y + 5.5, { align: 'center' })
  y += 13

  // Meta
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...DARK)
  doc.text(`Date: ${formatDateDDMMYYYY(today)}`, margin, y)
  doc.text(`Quote No: ${quoteNum}`, pageW - margin, y, { align: 'right' })
  y += 8

  // Addressed to
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLUE)
  doc.setFontSize(9)
  doc.text('To,', margin, y)
  y += 5
  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text(deal.customerCompany || deal.customerName || '', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (deal.customerAddress) {
    const lines = doc.splitTextToSize(String(deal.customerAddress), contentW * 0.6)
    doc.text(lines, margin, y)
    y += lines.length * 4.5
  }
  if (deal.customerName) {
    doc.setFont('helvetica', 'bold')
    doc.text(`Kind Attn: ${deal.customerName}`, margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
  } else {
    y += 2
  }

  // Intro paragraph
  const intro = 'Dear Sir, Further to your requirement of AIR SHOWER for your site, we are pleased to share Technical & Commercial details for your early acceptance. SAM AIR SHOWER assists to reduce Dust from Garments before Entry to Validated Areas by creating enough Turbulence of Air. Although SAM shares standard Models, we can provide Tailor-made Size/Working/Design as required.'
  doc.setFontSize(8.5)
  const introLines = doc.splitTextToSize(intro, contentW)
  doc.text(introLines, margin, y)
  y += introLines.length * 4.2 + 4

  // ---- Technical rows ----
  const config = deal.airShowerConfig ? (CONFIG_MAP[deal.airShowerConfig] || deal.airShowerConfig) : 'Straight Entry Straight Exit'
  const outer = (deal.outerWidth && deal.outerDepth && deal.outerHeight)
    ? `${deal.outerWidth} x ${deal.outerDepth} x ${deal.outerHeight} MM` : '900 x 1600 x 2100 MM'
  const inner = (deal.innerWidth && deal.innerDepth && deal.innerHeight)
    ? `${deal.innerWidth} x ${deal.innerDepth} x ${deal.innerHeight} MM` : '800 x 800 x 1980 MM'
  const isSS = !!deal.material && String(deal.material).includes('ss')
  const material = deal.material ? (MATERIAL_MAP[deal.material] || deal.material) : MATERIAL_MAP.ss304
  const finish = isSS ? 'Original Factory Hairline Finish' : 'Oven Baked Powder Coated'
  const doorLead = deal.doorType ? (DOOR_LEAD[deal.doorType] || 'Hinged') : 'Hinged'
  const doorDesc = `Single Leaf SS Pipe Section ${doorLead} Door, 800 width with 5mm View Float Glass`
  const motorType = deal.motorType ? (MOTOR_TYPE_MAP[deal.motorType] || deal.motorType) : 'IE2'
  const motorBrand = deal.motorBrand === 'other' ? (deal.motorBrandOther || 'Siemens/CG/BBL/Havells') : (deal.motorBrand || 'Siemens/CG/BBL/Havells')
  const motor = `Floor Mounted Type B3, ${motorBrand}, ${motorType}`
  const flooring = deal.flooringRequired ? 'CRCA Pipe Frame with SS Sheet on Top' : 'Existing Floor (Customer Scope)'
  const airFlow = `${deal.airFlowTime || '15-30'} Seconds (Adjustable)`
  const inputPower = deal.inputPower || '2HP × 1, 415V AC, 3 Phase, 50Hz, 4 wire'

  const techRows: [string, string][] = [
    ['Model / Type', deal.modelNumber || deal.dealNumber || '—'],
    ['Configuration', config],
    ['Overall Dimensions (W×D×H) — Outside (+/-15mm)', outer],
    ['Overall Dimensions (W×D×H) — Inside (+/-15mm)', inner],
    ['Suggested No. of persons washed at a time', deal.numberOfUsers ? String(deal.numberOfUsers) : 'One Person'],
    ['Material', material],
    ['Finish', finish],
    ['Doors (Entry & Exit)', doorDesc],
    ['Door Closer', 'Doorma make Door Closer, two valves for adjustable closing speed, TS 68'],
    ['Door Hardware', 'O Type Handle, Flag Type Hinge in Stainless Steel'],
    ['Air Outlet (Nozzle)', 'Multidirectional Stainless Steel Adjustable, Two side walls & top ceiling'],
    ['Nozzle Quantity', '15 Pcs'],
    ['Terminal Filter', 'HEPA Filter, Imported Micro Fine Glass Fibre Media, >99.97% efficiency for 0.3µ, H13 / EN 1822:2009'],
    ['Pre Filter', 'Synthetic Non-Woven Polyester, 90% for 10µ, Grade F7'],
    ['Fan', 'Galvanised Iron Forward Curved Blades, Direct Mounted'],
    ['Motor', motor],
    ['Logic', 'Microprocessor with Digital Display'],
    ['Illumination', 'LED Light Fixtures 08W, Havells/Orient/Equivalent'],
    ['Interlocking of Doors', 'Both Doors Interlocked — one door stays locked when other is unlocked'],
    ['Sensors', 'Sensor based Electromagnet Locks at Entry/Exit'],
    ['Emergency Switch', 'Emergency Switch in walkway to unlock both doors'],
    ['Flooring (Walkway)', flooring],
    ['Air Flow Time', airFlow],
    ['Input Power', inputPower],
    ['Warranty', '365 days against Manufacturing Defect or 410 days from first intimation of Inspection'],
  ]

  autoTable(doc, {
    startY: y,
    head: [['TECHNICALS', 'DETAIL']],
    body: techRows,
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, valign: 'top' },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: contentW - 60 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ---- Commercials ----
  const basic = deal.quotedAmount || 0
  const qty = deal.estimatedQty || 1
  const lineAmount = basic * qty
  const gst = lineAmount * 0.18
  const grand = lineAmount + gst
  const modelSize = `${deal.modelNumber || deal.dealNumber || 'Air Shower'}\n${outer}`

  if (y > 230) { doc.addPage(); y = 20 }

  autoTable(doc, {
    startY: y,
    head: [['Sl No', 'Model # Size', 'Basic Cost/Pc (INR)', 'Qty', 'Amount']],
    body: [
      ['1', modelSize, inr(basic), String(qty), inr(lineAmount)] as any,
      [{ content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: inr(lineAmount), styles: { fontStyle: 'bold' } }] as any,
      [{ content: 'Add GST @18% (HSN 84145930)', colSpan: 4, styles: { halign: 'right' } }, { content: inr(gst) }] as any,
      [{ content: 'GRAND TOTAL (incl. GST)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', textColor: RED } }, { content: inr(grand), styles: { fontStyle: 'bold', textColor: RED } }] as any,
    ],
    theme: 'grid',
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 70 }, 2: { cellWidth: 38 }, 3: { cellWidth: 16 }, 4: { cellWidth: contentW - 138 } },
    margin: { left: margin, right: margin },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // ---- bullet section helper ----
  function bulletSection(heading: string, items: string[], fontSize = 7.8) {
    const lineH = fontSize * 0.5
    if (y + 14 > pageH - 16) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLUE)
    doc.text(heading, margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    doc.setTextColor(...DARK)
    for (const item of items) {
      const lines = doc.splitTextToSize(`•  ${item}`, contentW - 2)
      if (y + lines.length * lineH > pageH - 16) { doc.addPage(); y = 20 }
      doc.text(lines, margin + 1, y)
      y += lines.length * lineH + 1
    }
    y += 4
  }

  const dispatch = '2-3 working weeks from receipt of PO & Advance.'
  const payment = deal.paymentTerms || '50% advance, balance against PI before dispatch.'
  const freight = deal.freightTerms || 'Insurance / Freight / Unloading / Shifting to location: Buyer scope.'
  const inspection = deal.inspectionTerms || 'Before Dispatch at our Factory (expenses to Buyer scope).'

  bulletSection('TERMS & CONDITIONS', [
    `Dispatch: ${dispatch}`,
    `Payment Terms: ${payment}`,
    'Air Shower supplied in "Plug & Play" unless specified by Buyer in writing.',
    'Assembly at site: ₹40,000/Pc + GST (SAC 998736). Dismantling/Re-assembly extra chargeable.',
    freight,
    'Standard Packing (Paper Corrugated + Stretch Film) included. Wooden Crate extra on request.',
    `Inspection: ${inspection}`,
    'Quote Validity: 20 days from date of quote.',
    'Items not mentioned here are extra to cost.',
  ])

  bulletSection('CUSTOMER SCOPE', [
    'Incoming Power Supply terminating at Air Shower Electrical Panel suitable for 1.5kW, 3 Phase + Neutral + Earth.',
    'Level Flooring at actual install site.',
    'Sealing between existing opening & supplied Air Shower at site.',
    'Uninterrupted Stabilised Power Supply.',
  ])

  bulletSection('OPTIONAL ITEMS', [
    'Air Curtain at Entry without interlocks',
    'Biometric/Card Access door unlock',
    '"L" Type Air Shower',
    'Emergency Light on power failure',
    'Enter/Wait Display',
    'Grated Flooring/Water Tray/Shoe Sole Cleaner',
    'Inside SS + Outside MS skin',
    'Camera provision in walkway',
    'Telephone/Music Speaker',
    'Auto Slide / High Speed Door',
    'Commercial Block Board or Aluminium body',
    'Flame Proof Construction & Electricals',
    'Anti Static Discharge Bar',
    'ESD unlocks entry',
  ])

  // ---- Bank details ----
  if (y + 38 > pageH - 16) { doc.addPage(); y = 20 }
  doc.setDrawColor(...BLUE)
  doc.setFillColor(...LIGHT_GRAY)
  doc.roundedRect(margin, y, contentW, 34, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BLUE)
  doc.text('BANK DETAILS', margin + 3, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...DARK)
  const bankLines = [
    'Bank Name: JAMMU & KASHMIR BANK',
    'Branch: P-2, JOP Plaza, Sector 18, Noida 201301, Uttar Pradesh',
    'Account Type: Cash Credit',
    'Account Number: 0319020100000188',
    'RTGS/NEFT/IFSC Code: JAKA0GHAZIA',
  ]
  let by = y + 11
  for (const l of bankLines) { doc.text(l, margin + 3, by); by += 4.6 }
  y += 40

  // ---- Sign-off ----
  if (y + 28 > pageH - 16) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(60, 60, 60)
  doc.text('We look forward to your early confirmation.', margin, y)
  y += 5
  doc.text('Warm Regards,', margin, y)
  y += 5
  doc.setFont('helvetica', 'bold')
  doc.text('For SAM PRODUCTS Pvt Ltd', margin, y)
  y += 5
  doc.text('Authorised Signatory', margin, y)
  y += 7
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  const note = doc.splitTextToSize('Note: Design / Size / Specifications are subject to change even after written confirmation by Manufacturer.', contentW)
  doc.text(note, margin, y)

  // ---- Page numbers ----
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Page ${i} of ${pageCount}  |  ${quoteNum}`, pageW / 2, pageH - 8, { align: 'center' })
  }

  const company = (deal.customerCompany || deal.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Quote_${serial}_${company}.pdf`)
}
