// SAM PRODUCTS — Work Order (Air Shower) field template.
// Transcribed from the official WORK ORDER - AIR SHOWER sheet.
//
// Field types:
//   'choice'  -> single-select tickboxes (radio behaviour)
//   'multi'   -> multi-select tickboxes (checkboxes)
//   'dims'    -> W x D x H numeric triple
//   'text'    -> free text / number
//   'date'    -> date
//
// filledBy: 'production' (default, filled by manufacturing) or 'accounts'
//   (the '@' fields in the sample — filled by accounts after production).
// autoFrom: key on the Deal the value can be pre-filled from.

export type WoFieldType = 'choice' | 'multi' | 'dims' | 'text' | 'date'

export interface WoField {
  key: string
  label: string
  type: WoFieldType
  options?: string[]
  filledBy?: 'production' | 'accounts'
  autoFrom?: string
  note?: string
}

export interface WoSection {
  title: string
  fields: WoField[]
}

export const WO_TEMPLATE: WoSection[] = [
  {
    title: 'Identity',
    fields: [
      { key: 'itemSrNo', label: 'Item Sr No.', type: 'text', filledBy: 'accounts' },
      { key: 'poNoDate', label: 'PO No / Date', type: 'text', filledBy: 'accounts' },
      { key: 'startDate', label: 'Start Date', type: 'date', filledBy: 'accounts' },
      { key: 'inspectionDate', label: 'Inspection Date', type: 'date', filledBy: 'accounts' },
      { key: 'dispatchDate', label: 'Dispatch Date', type: 'date', filledBy: 'accounts' },
      { key: 'prodInch', label: 'Production Incharge', type: 'text', filledBy: 'accounts' },
      { key: 'modelNo', label: 'Model No', type: 'text', autoFrom: 'modelNumber' },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'insideSize', label: 'Inside Size (mm) W×D×H', type: 'dims', autoFrom: 'inner' },
      { key: 'outsideSize', label: 'Outside Size (mm) W×D×H', type: 'dims', autoFrom: 'outer' },
      { key: 'type', label: 'Type', type: 'choice', options: ['Straight Entry Straight Exit', 'Right Exit', 'Left Exit', 'Straight & Right', 'Straight & Left', 'Right & Left'] },
    ],
  },
  {
    title: 'Cabinet',
    fields: [
      { key: 'mocIn', label: 'MOC (Inside)', type: 'choice', options: ['MS', 'SS 202', 'SS 304', 'SS 316', 'GI'] },
      { key: 'mocOut', label: 'MOC (Outside)', type: 'choice', options: ['MS', 'SS 202', 'SS 304', 'SS 316', 'GI'] },
      { key: 'sheetMake', label: 'Sheet Make', type: 'text' },
      { key: 'sheetSize', label: 'Sheet Size', type: 'choice', options: ['8*4 16G', '8*4 18G', '8*3 18G', '10*5 18G'] },
      { key: 'sheetQty', label: 'Sheet Qty', type: 'choice', options: ['1', '2', '3', '4'] },
      { key: 'weightEachSheet', label: 'Weight each sheet', type: 'text' },
      { key: 'finish', label: 'Finish', type: 'choice', options: ['Hairline', 'Mat', 'Glossy'] },
      { key: 'colour', label: 'Colour', type: 'choice', options: ['Ivory', 'Str Munshel Grey', 'White'] },
      { key: 'powderCoatingBill', label: 'Powder Coating Bill', type: 'text', filledBy: 'accounts' },
    ],
  },
  {
    title: 'Motor & Blower',
    fields: [
      { key: 'motorMount', label: 'Motor Mounting', type: 'choice', options: ['Top Mounted', 'Floor Mounted'] },
      { key: 'motorMake', label: 'Motor Make', type: 'choice', options: ['ABB', 'Siemens', 'CG', 'BB', 'Havells'] },
      { key: 'motorQty', label: 'Motor Qty', type: 'choice', options: ['1', '2', '3', '4'] },
      { key: 'motorSerialNo', label: 'Motor Serial No', type: 'text' },
      { key: 'motorRating', label: 'Motor Rating', type: 'choice', options: ['IE 2', 'IE 3', 'IE 4', 'IE 5'] },
      { key: 'flameProofMotor', label: 'Flame Proof Motor', type: 'choice', options: ['Yes', 'No'] },
      { key: 'blowerMake', label: 'Blower Make', type: 'choice', options: ['GI', 'Aluminium', 'MS'] },
      { key: 'blowerMoc', label: 'Blower MOC', type: 'choice', options: ['SS 202', 'MS', 'SS 304'] },
      { key: 'airFlow', label: 'Air Flow (m/s)', type: 'text' },
      { key: 'vibration', label: 'Vibration', type: 'text' },
      { key: 'noiseLevel', label: 'Noise Level (dbA)', type: 'text' },
    ],
  },
  {
    title: 'Door',
    fields: [
      { key: 'doorType', label: 'Door', type: 'choice', options: ['Sliding Auto', 'Sliding Manual', 'Hinged Single Leaf', 'Hinged Double Leaf', 'Without Door'] },
      { key: 'doorCloser', label: 'Door Closer', type: 'choice', options: ['Doorma', 'Sandhu', 'NA'] },
      { key: 'doorCloserQty', label: 'Door Closer Qty', type: 'choice', options: ['1', '2', '3', '4'] },
      { key: 'doorFrameOD', label: 'Door Frame Size (OD) W×D×H', type: 'dims' },
      { key: 'doorFrameID', label: 'Door Frame Size (ID) W×D×H', type: 'dims' },
      { key: 'doorFrameMoc', label: 'Door Frame MOC', type: 'choice', options: ['MS', 'SS 202', 'SS 304', 'SS 316', 'GI', 'Aluminium'] },
      { key: 'doorTopMoc', label: 'Door (Top)', type: 'choice', options: ['Sheet MS', 'Sheet SS 202', 'Sheet SS 304', 'Glass Toughened', 'Glass Float 5mm', 'Glass 6.8mm', 'Glass 7.2mm'] },
      { key: 'glassSizeTop', label: 'Glass / Sheet Size (Top) W×D×H', type: 'dims' },
      { key: 'doorBottomMoc', label: 'Door (Bottom)', type: 'choice', options: ['Sheet MS', 'Sheet SS 202', 'Sheet SS 304', 'Glass Toughened', 'Glass Float 5mm', 'Glass 6.8mm', 'Glass 7.2mm'] },
      { key: 'glassSizeBottom', label: 'Glass / Sheet Size (Bottom) W×D×H', type: 'dims' },
      { key: 'viewGlass', label: 'Door (View Glass)', type: 'choice', options: ['Float', '5mm', '6.8mm', '7.2mm', 'Toughened'] },
      { key: 'doorHandle', label: 'Door Handle', type: 'choice', options: ['D Type', 'O Type', 'NA'] },
      { key: 'doorHinge', label: 'Door Hinge', type: 'choice', options: ['Fixed', 'Moving', 'MS', 'SS', 'Aluminium'] },
      { key: 'doorKickPlate', label: 'Door Kick Plate', type: 'choice', options: ['SS', 'MS', '2', '3', '4', 'NA'] },
    ],
  },
  {
    title: 'Grill & Flooring',
    fields: [
      { key: 'grillType', label: 'Grill', type: 'choice', options: ['Perforated', 'Slotted', 'GI', 'MS', 'Aluminium'] },
      { key: 'grillFinish', label: 'Grill (Finish/Return)', type: 'choice', options: ['MS Grill', 'with Water Tray', 'Plain Sheet'] },
      { key: 'flooringMoc', label: 'Flooring', type: 'choice', options: ['PVC', 'SS 202', 'SS 304', 'Aluminium'] },
      { key: 'flooringType', label: 'Flooring Type', type: 'choice', options: ['SS Sheet', 'MS + PVC', 'Grated', 'Shoe Sole Cleaner', 'Without', 'Antistatic'] },
      { key: 'waterTrayLoc', label: 'Floor (Water Tray) Location', type: 'choice', options: ['Front', 'Back', 'Right Wall', 'Left Wall', 'NA'] },
      { key: 'flooringColourPvc', label: 'Flooring Colour (PVC)', type: 'choice', options: ['NA', 'Blue', 'White', 'Grey'] },
    ],
  },
  {
    title: 'Nozzle',
    fields: [
      { key: 'nozzleMoc', label: 'Nozzle', type: 'choice', options: ['Fixed', 'Moving', 'MS', 'SS', 'Aluminium'] },
      { key: 'nozzleAngle', label: 'Nozzle Angle', type: 'choice', options: ['15', '30', '45', '60', 'NA'] },
      { key: 'nozzleRightWall', label: 'Nozzles — Right Wall (qty)', type: 'text' },
      { key: 'nozzleLeftWall', label: 'Nozzles — Left Wall (qty)', type: 'text' },
      { key: 'nozzleTop', label: 'Nozzles — Top (qty)', type: 'text' },
    ],
  },
  {
    title: 'Filters',
    fields: [
      { key: 'preFilterQty', label: 'Pre Filter Qty', type: 'choice', options: ['1', '2', '3', '4', 'NA'] },
      { key: 'preFilterType', label: 'Pre Filter Type', type: 'choice', options: ['Flange', 'Cassette', 'Box Type'] },
      { key: 'preFilterSize', label: 'Pre Filter (Size) W×D×H', type: 'dims' },
      { key: 'preFilterMake', label: 'Pre Filter Make', type: 'text', filledBy: 'accounts' },
      { key: 'hepaQty', label: 'HEPA Filter Qty', type: 'choice', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
      { key: 'hepaType', label: 'HEPA Filter Type', type: 'choice', options: ['Flange', 'Cassette', 'Box Type'] },
      { key: 'hepaSize', label: 'HEPA Filter (Size) W×D×H', type: 'dims' },
      { key: 'hepaMaintCoverSize', label: 'HEPA Maint. Cover Size W×D×H', type: 'dims' },
      { key: 'hepaMake', label: 'HEPA Filter Make', type: 'text', filledBy: 'accounts' },
      { key: 'maintFilterSize', label: 'Maint. Filter (Size) W×D×H', type: 'dims' },
    ],
  },
  {
    title: 'Electrical Panel',
    fields: [
      { key: 'panelMake', label: 'Elect. Panel Make', type: 'choice', options: ['Styrax', 'MS', 'GI', 'SS'] },
      { key: 'panelSensors', label: 'Elect. Panel — Controls', type: 'multi', options: ['Door Interlock', 'Beam Sensor', 'Motion Sensor', 'Without Interlock'] },
      { key: 'panelLocation', label: 'Elect. Panel Location', type: 'choice', options: ['NA', 'Front Top', 'Near Blower', 'Near HEPA'] },
      { key: 'panelContactor', label: 'Elect. Panel Contactor', type: 'text' },
      { key: 'panelTimer', label: 'Elect. Panel (Timer)', type: 'text' },
      { key: 'panelNumber', label: 'Elect. Panel Number', type: 'text', filledBy: 'accounts' },
    ],
  },
  {
    title: 'Lights & Misc',
    fields: [
      { key: 'ledLightQty', label: 'LED Light', type: 'choice', options: ['1#', '2#', '3#', 'Inside Panel only', 'NA'] },
      { key: 'ledWattage', label: 'LED Wattage', type: 'choice', options: ['6', '8', '12'] },
      { key: 'uvLight', label: 'UV Light', type: 'choice', options: ['NA', '1', '2', '3'] },
      { key: 'entryLed', label: 'Entry LED', type: 'choice', options: ['NA', 'Red & Green Round 01 each', 'Size 4"', 'Size 6"'] },
      { key: 'meter', label: 'Meter', type: 'choice', options: ['Manometer', 'Magnehelic', 'NA'] },
      { key: 'canvas', label: 'Canvas', type: 'choice', options: ['1', '2', '3', '4', 'NA'] },
      { key: 'nutsBolts', label: 'Nuts / Bolts / Screws', type: 'text' },
      { key: 'finalCheckedBy', label: 'Final Checked By', type: 'text' },
      { key: 'finalCheckedOn', label: 'Final Checked On', type: 'date', filledBy: 'accounts' },
    ],
  },
  {
    title: 'Packing & Dispatch',
    fields: [
      { key: 'packingType', label: 'Packing', type: 'choice', options: ['Loose', 'Parts', 'Ready to Use'] },
      { key: 'packingMaterial', label: 'Packing Material', type: 'multi', options: ['Corrugated Roll', 'Stretch Film', 'Thermocole', 'Bubble'] },
      { key: 'pallet', label: 'Pallet', type: 'choice', options: ['Wooden', 'NA'], filledBy: 'accounts' },
      { key: 'freight', label: 'Freight', type: 'choice', options: ['Customer', 'SPPL'], filledBy: 'accounts' },
      { key: 'dispatch', label: 'Dispatch', type: 'date', filledBy: 'accounts' },
      { key: 'billedBy', label: 'Billed By', type: 'text', filledBy: 'accounts' },
      { key: 'installedDate', label: 'Installed Date', type: 'date', filledBy: 'accounts' },
      { key: 'installedBy', label: 'Installed by', type: 'text', filledBy: 'accounts' },
      { key: 'paymentPendingAmt', label: 'Payment Pending Amount', type: 'text', filledBy: 'accounts' },
      { key: 'manualSentOn', label: 'Manual sent on', type: 'date', filledBy: 'accounts' },
      { key: 'manualRecdBy', label: 'Manual recd by', type: 'text', filledBy: 'accounts' },
      { key: 'installMailSentOn', label: 'Installation Mail sent on', type: 'date', filledBy: 'accounts' },
    ],
  },
  {
    title: 'Buyer & Contacts (Accounts)',
    fields: [
      { key: 'buyerName', label: 'Buyer Name', type: 'text', filledBy: 'accounts', autoFrom: 'customerCompany' },
      { key: 'deliveryAddress', label: 'Delivery Address', type: 'text', filledBy: 'accounts' },
      { key: 'billingAddress', label: 'Billing Address', type: 'text', filledBy: 'accounts', autoFrom: 'customerAddress' },
      { key: 'siteContactPerson', label: 'Site Contact Person', type: 'text', filledBy: 'accounts' },
      { key: 'siteContactMobile', label: 'Site Contact Mobile', type: 'text', filledBy: 'accounts' },
      { key: 'siteContactMail', label: 'Site Contact Mail', type: 'text', filledBy: 'accounts' },
      { key: 'poContactPerson', label: 'PO Contact Person', type: 'text', filledBy: 'accounts', autoFrom: 'customerName' },
      { key: 'poContactMobile', label: 'PO Contact Mobile', type: 'text', filledBy: 'accounts', autoFrom: 'customerPhone' },
      { key: 'poContactMail', label: 'PO Contact Mail', type: 'text', filledBy: 'accounts', autoFrom: 'customerEmail' },
    ],
  },
]

// Flat list of all fields (helper)
export const WO_ALL_FIELDS: WoField[] = WO_TEMPLATE.flatMap(s => s.fields)
