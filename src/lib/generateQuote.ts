import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { drawSamLogo } from './pdfLogo'

// ---- Restrained, professional palette ----
const NAVY: [number, number, number] = [31, 63, 99]      // #1f3f63 — headers, rules
const NAVY_SOFT: [number, number, number] = [46, 84, 128] // lighter navy accents
const INK: [number, number, number] = [28, 32, 38]        // near-black body text
const GREY: [number, number, number] = [120, 128, 138]    // muted grey (contacts, footer)
const GREY_LINE: [number, number, number] = [214, 220, 227]
const LIGHT: [number, number, number] = [244, 246, 248]   // #f4f6f8 zebra / section backgrounds
const WHITE: [number, number, number] = [255, 255, 255]
const GREEN: [number, number, number] = [22, 101, 74]     // deep green for grand total

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
  return `INR ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  const margin = 16
  const contentW = pageW - 2 * margin
  const footerY = pageH - 14

  const today = new Date()
  const serial = quoteSerial(today)
  const quoteNum = `SPPL/AS/${serial}`

  // ===== Header (white band, navy logo, grey contact block, thin navy rule) =====
  function drawHeader() {
    // Logo, top-left, in navy
    drawSamLogo(doc, margin, 12, NAVY)

    // Company contact block, right-aligned, small grey
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GREY)
    const rx = pageW - margin
    let ry = 13
    const contact = [
      'H-161, Site V, UPSIDA, Kasna, Greater Noida 201310, U.P.',
      'Ph: 9810065139   ·   www.samproducts.net',
      'samproducts1992@gmail.com  ·  samproducts25@gmail.com',
      'GSTIN: 09AAKCS6327D1Z8   ·   CIN: U51101UP2007PTC055433',
    ]
    for (const line of contact) { doc.text(line, rx, ry, { align: 'right' }); ry += 3.9 }

    // thin navy rule under the header
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.6)
    doc.line(margin, 30, pageW - margin, 30)
  }

  // ===== Footer on every page (added at the end for all pages) =====
  function drawFooter(pageNo: number, pageCount: number) {
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.4)
    doc.line(margin, footerY, pageW - margin, footerY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...NAVY)
    doc.text('SAM PRODUCTS Pvt. Ltd. — Since 1992', margin, footerY + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    doc.text(`Page ${pageNo} of ${pageCount}   ·   ${quoteNum}`, pageW - margin, footerY + 4, { align: 'right' })
    doc.setFontSize(6.2)
    doc.text('This quotation is computer generated. Design / Size / Specifications are subject to change even after written confirmation.', margin, footerY + 7.6)
  }

  // Small uppercase navy section heading with a short underline
  function sectionHeading(title: string) {
    if (y + 12 > footerY - 4) { newPage() }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text(title.toUpperCase(), margin, y)
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.7)
    doc.line(margin, y + 1.6, margin + 22, y + 1.6)
    y += 6
  }

  drawHeader()
  let y = 38

  function newPage() {
    doc.addPage()
    drawHeader()
    y = 38
  }

  // ===== Title chip: centered "QUOTATION" with subtle background =====
  const chipW = 60
  const chipX = (pageW - chipW) / 2
  doc.setFillColor(...LIGHT)
  doc.setDrawColor(...GREY_LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(chipX, y, chipW, 9, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...NAVY)
  doc.text('QUOTATION', pageW / 2, y + 6.1, { align: 'center' })
  y += 14

  // ===== Quote No + Date on one refined line =====
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.text('Quote No: ', margin, y)
  const qLabelW = doc.getTextWidth('Quote No: ')
  doc.setFont('helvetica', 'normal')
  doc.text(quoteNum, margin + qLabelW, y)
  doc.setFont('helvetica', 'bold')
  const dateLabel = 'Date: '
  const dateVal = formatDateDDMMYYYY(today)
  const dateValW = doc.getTextWidth(dateVal)
  doc.setFont('helvetica', 'normal')
  doc.text(dateVal, pageW - margin, y, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(dateLabel, pageW - margin - dateValW, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  y += 6

  // ===== "To / Kind Attn" block in a light card =====
  const toLines: { text: string; bold?: boolean; size?: number; color?: [number, number, number] }[] = []
  toLines.push({ text: 'TO', bold: true, size: 7.5, color: NAVY })
  toLines.push({ text: deal.customerCompany || deal.customerName || '', bold: true, size: 10.5 })
  if (deal.customerAddress) {
    const addr = doc.splitTextToSize(String(deal.customerAddress), contentW * 0.62) as string[]
    for (const a of addr) toLines.push({ text: a, size: 8.5 })
  }
  if (deal.customerName && (deal.customerCompany)) {
    toLines.push({ text: `Kind Attn: ${deal.customerName}`, bold: true, size: 8.5 })
  }
  // measure card height
  let cardH = 4
  for (const l of toLines) cardH += (l.size || 8.5) * 0.44 + 1.4
  cardH += 2

  doc.setFillColor(...LIGHT)
  doc.setDrawColor(...GREY_LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, contentW, cardH, 1.5, 1.5, 'FD')
  // navy accent bar on the left edge
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, 1.4, cardH, 'F')

  let ty = y + 5
  for (const l of toLines) {
    doc.setFont('helvetica', l.bold ? 'bold' : 'normal')
    doc.setFontSize(l.size || 8.5)
    doc.setTextColor(...(l.color || INK))
    doc.text(l.text, margin + 5, ty)
    ty += (l.size || 8.5) * 0.44 + 1.4
  }
  y += cardH + 5

  // ===== Intro paragraph =====
  const intro = 'Dear Sir, Further to your requirement of AIR SHOWER for your site, we are pleased to share the Technical & Commercial details below for your early acceptance. SAM AIR SHOWER helps reduce dust from garments before entry to validated areas by creating sufficient turbulence of air. While SAM offers standard models, we can also provide tailor-made size / working / design as required.'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK)
  const introLines = doc.splitTextToSize(intro, contentW) as string[]
  doc.text(introLines, margin, y)
  y += introLines.length * 4.1 + 5

  // ===== Technical rows =====
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

  sectionHeading('Technical Specifications')

  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Specification']],
    body: techRows,
    theme: 'grid',
    styles: { lineColor: GREY_LINE, lineWidth: 0.1, textColor: INK, cellPadding: 1.8 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 9, cellPadding: 2.2, halign: 'left' },
    bodyStyles: { fontSize: 8.5, valign: 'top' },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62, textColor: NAVY }, 1: { cellWidth: contentW - 62 } },
    margin: { left: margin, right: margin, bottom: 20 },
  })

  y = (doc as any).lastAutoTable.finalY + 9

  // ===== Commercials =====
  const basic = deal.basicPrice || deal.quotedAmount || 0
  const hasDiscount = !!deal.basicPrice && !!deal.discountValue
  const discountAmt = hasDiscount
    ? (deal.discountType === 'percent' ? basic * Number(deal.discountValue) / 100 : Number(deal.discountValue))
    : 0
  const unitFinal = deal.finalPrice || Math.max(0, basic - discountAmt)
  const qty = deal.estimatedQty || 1
  const lineAmount = unitFinal * qty
  const gst = lineAmount * 0.18
  const grand = lineAmount + gst
  const modelSize = `${deal.modelNumber || deal.dealNumber || 'Air Shower'}\n${outer}`

  const FREIGHT_MAP: Record<string, string> = {
    customer_pays: 'Customer to Pay',
    we_bear: 'We Bear — included',
    we_ask_extra: `Extra — ${deal.freightAmount ? inr(Number(deal.freightAmount)) : 'at actuals'}`,
  }
  const ASSEMBLY_MAP: Record<string, string> = {
    not_required: 'Not Required',
    chargeable: `Chargeable — ${deal.assemblyCharge ? inr(Number(deal.assemblyCharge)) : 'extra'}`,
    included: 'Included in Basic Price',
    visit_after_supply: `Visit After Supply — extra ${deal.assemblyCharge ? inr(Number(deal.assemblyCharge)) : 'chargeable'}`,
  }
  // Installation/assembly only shown when the customer actually opts for it
  const wantsInstallation = !!deal.assemblyAtSite && deal.assemblyAtSite !== 'not_required'

  const summaryRowStyle = { halign: 'right' as const }
  const freightRow: any[] | null = deal.freightBearer
    ? [{ content: 'Freight', colSpan: 4, styles: summaryRowStyle }, { content: FREIGHT_MAP[deal.freightBearer] || deal.freightBearer, styles: { halign: 'right' as const } }]
    : null
  const assemblyRow: any[] | null = wantsInstallation
    ? [{ content: 'Installation / Assembly', colSpan: 4, styles: summaryRowStyle }, { content: ASSEMBLY_MAP[deal.assemblyAtSite] || deal.assemblyAtSite, styles: { halign: 'right' as const } }]
    : null

  const basicLineAmount = basic * qty
  const discountLineAmount = discountAmt * qty
  const discountLabel = `Discount${deal.discountType === 'percent' ? ` (${deal.discountValue}%)` : ''}`

  if (y + 60 > footerY - 4) { newPage() }

  sectionHeading('Commercials')

  autoTable(doc, {
    startY: y,
    head: [['Sl', 'Model & Size', 'Basic Cost / Pc', 'Qty', 'Amount']],
    body: [
      ['1', modelSize, inr(hasDiscount ? basic : unitFinal), String(qty),
        { content: inr(hasDiscount ? basicLineAmount : lineAmount), styles: { halign: 'right' as const } }] as any,
      ...(hasDiscount ? [
        [{ content: 'Basic / Initial Price', colSpan: 4, styles: summaryRowStyle }, { content: inr(basicLineAmount), styles: { halign: 'right' as const } }] as any,
        [{ content: discountLabel, colSpan: 4, styles: summaryRowStyle }, { content: `- ${inr(discountLineAmount)}`, styles: { halign: 'right' as const, textColor: GREEN } }] as any,
        [{ content: 'Final Price', colSpan: 4, styles: { halign: 'right' as const, fontStyle: 'bold' as const } }, { content: inr(lineAmount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } }] as any,
      ] : [
        [{ content: 'Total', colSpan: 4, styles: { halign: 'right' as const, fontStyle: 'bold' as const } }, { content: inr(lineAmount), styles: { halign: 'right' as const, fontStyle: 'bold' as const } }] as any,
      ]),
      [{ content: 'Add GST @ 18% (HSN 84145930)', colSpan: 4, styles: summaryRowStyle }, { content: inr(gst), styles: { halign: 'right' as const } }] as any,
      ...(freightRow ? [freightRow] : []),
      ...(assemblyRow ? [assemblyRow] : []),
      [{ content: 'GRAND TOTAL (incl. GST)', colSpan: 4, styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: NAVY, textColor: WHITE, fontSize: 9.5 } },
        { content: inr(grand), styles: { halign: 'right' as const, fontStyle: 'bold' as const, fillColor: NAVY, textColor: WHITE, fontSize: 9.5 } }] as any,
    ],
    theme: 'grid',
    styles: { lineColor: GREY_LINE, lineWidth: 0.1, textColor: INK, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8.8, halign: 'left' },
    bodyStyles: { fontSize: 8.8, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 66, fontStyle: 'bold' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: contentW - 132, halign: 'right' },
    },
    margin: { left: margin, right: margin, bottom: 20 },
  })

  y = (doc as any).lastAutoTable.finalY + 9

  // ===== bullet section helper =====
  function bulletSection(heading: string, items: string[], fontSize = 8.2) {
    const lineH = fontSize * 0.52
    sectionHeading(heading)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize)
    doc.setTextColor(...INK)
    for (const item of items) {
      const lines = doc.splitTextToSize(item, contentW - 6) as string[]
      const blockH = lines.length * lineH + 2
      if (y + blockH > footerY - 4) { newPage(); sectionHeadingContinued(heading) }
      // bullet dot
      doc.setFillColor(...NAVY_SOFT)
      doc.circle(margin + 1.4, y - 1.3, 0.7, 'F')
      doc.text(lines, margin + 5, y)
      y += blockH
    }
    y += 4
  }
  function sectionHeadingContinued(heading: string) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...NAVY)
    doc.text(`${heading.toUpperCase()} (CONTD.)`, margin, y)
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.7)
    doc.line(margin, y + 1.6, margin + 22, y + 1.6)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.2)
    doc.setTextColor(...INK)
  }

  const dispatch = '2-3 working weeks from receipt of PO & Advance.'
  const payment = deal.paymentTerms || '50% advance, balance against PI before dispatch.'
  const freight = deal.freightTerms || 'Insurance / Freight / Unloading / Shifting to location: Buyer scope.'
  const inspection = deal.inspectionTerms || 'Before Dispatch at our Factory (expenses to Buyer scope).'

  bulletSection('Terms & Conditions', [
    `Dispatch: ${dispatch}`,
    `Payment Terms: ${payment}`,
    'Air Shower supplied in "Plug & Play" unless specified by Buyer in writing.',
    ...(wantsInstallation ? ['Assembly at site: INR 40,000 / Pc + GST (SAC 998736). Dismantling / Re-assembly extra chargeable.'] : []),
    freight,
    'Shifting & unloading at customer scope. Insurance — freight bearer pays.',
    'Standard Packing (Paper Corrugated + Stretch Film) included. Wooden Crate extra on request.',
    `Inspection: ${inspection}`,
    'Quote Validity: 20 days from date of quote.',
    'Items not mentioned here are extra to cost.',
  ])

  bulletSection('Customer Scope', [
    'Incoming Power Supply terminating at Air Shower Electrical Panel suitable for 1.5kW, 3 Phase + Neutral + Earth.',
    'Level Flooring at actual install site.',
    'Sealing between existing opening & supplied Air Shower at site.',
    'Uninterrupted Stabilised Power Supply.',
  ])

  bulletSection('Optional Items', [
    'Air Curtain at Entry without interlocks',
    'Biometric / Card Access door unlock',
    '"L" Type Air Shower',
    'Emergency Light on power failure',
    'Enter / Wait Display',
    'Grated Flooring / Water Tray / Shoe Sole Cleaner',
    'Inside SS + Outside MS skin',
    'Camera provision in walkway',
    'Telephone / Music Speaker',
    'Auto Slide / High Speed Door',
    'Commercial Block Board or Aluminium body',
    'Flame Proof Construction & Electricals',
    'Anti Static Discharge Bar',
    'ESD unlocks entry',
  ])

  // ===== Bank details =====
  const bankH = 32
  if (y + bankH > footerY - 4) { newPage() }
  sectionHeading('Bank Details')
  doc.setFillColor(...LIGHT)
  doc.setDrawColor(...GREY_LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, contentW, bankH, 1.5, 1.5, 'FD')
  doc.setFillColor(...NAVY)
  doc.rect(margin, y, 1.4, bankH, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK)
  const bankPairs: [string, string][] = [
    ['Bank Name', 'Jammu & Kashmir Bank'],
    ['Branch', 'P-2, JOP Plaza, Sector 18, Noida 201301, U.P.'],
    ['Account Type', 'Cash Credit'],
    ['Account Number', '0319020100000188'],
    ['RTGS / NEFT / IFSC', 'JAKA0GHAZIA'],
  ]
  let by = y + 6
  for (const [k, v] of bankPairs) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(`${k}:`, margin + 5, by)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    doc.text(v, margin + 42, by)
    by += 5
  }
  y += bankH + 7

  // ===== Sign-off =====
  if (y + 26 > footerY - 4) { newPage() }
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8.5)
  doc.setTextColor(...GREY)
  doc.text('We look forward to your early confirmation.', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text('Warm Regards,', margin, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('For SAM PRODUCTS Pvt. Ltd.', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text('Authorised Signatory', margin, y)

  // ===== Footer on every page =====
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    drawFooter(i, pageCount)
  }

  const company = (deal.customerCompany || deal.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Quote_${serial}_${company}.pdf`)
}
