import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const STAGES = [
  { id: 'inquiry', label: 'Inquiry Received', color: 'bg-gray-100 text-gray-800' },
  { id: 'tds_sent', label: 'TDS Sent', color: 'bg-blue-100 text-blue-800' },
  { id: 'quote_sent', label: 'Quote Sent', color: 'bg-purple-100 text-purple-800' },
  { id: 'follow_up', label: 'Follow Up', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'po_received', label: 'PO Received', color: 'bg-orange-100 text-orange-800' },
  { id: 'po_vetted', label: 'PO Vetted', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'pi_sent', label: 'PI Sent', color: 'bg-pink-100 text-pink-800' },
  { id: 'approval_pending', label: 'Approval Pending', color: 'bg-amber-100 text-amber-800' },
  { id: 'production', label: 'In Production', color: 'bg-cyan-100 text-cyan-800' },
  { id: 'dispatch_ready', label: 'Ready for Dispatch', color: 'bg-teal-100 text-teal-800' },
  { id: 'dispatched', label: 'Dispatched', color: 'bg-green-100 text-green-800' },
  { id: 'feedback_pending', label: 'Feedback Pending', color: 'bg-lime-100 text-lime-800' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-200 text-green-900' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' },
]

// Pipeline split: a "lead" becomes an "active deal" once a PO is received.
export const LEAD_STAGES = ['inquiry', 'tds_sent', 'quote_sent', 'follow_up']
export const ACTIVE_STAGES = ['po_received', 'po_vetted', 'pi_sent', 'approval_pending', 'production', 'dispatch_ready', 'dispatched', 'feedback_pending']
export const CLOSED_STAGES = ['closed_won', 'closed_lost']

// Estimated days are defaults — actual duration depends on load
export const PRODUCTION_STAGES = [
  { key: 'sheet_designing', label: 'Sheet Designing', estimatedDays: 1 },
  { key: 'sheet_cutting_bending', label: 'Sheet Cutting & Bending', estimatedDays: 1 },
  { key: 'pipe_cutting_base_plate', label: 'Pipe Cutting & Base Plate', estimatedDays: 1 },
  { key: 'assembly_1', label: 'Assembly 1', estimatedDays: 2 },
  { key: 'door_making', label: 'Door Making', estimatedDays: 1 },
  { key: 'powder_coating', label: 'Powder Coating (if required)', estimatedDays: 3, conditional: true },
  { key: 'assembly_2', label: 'Assembly 2 (after powder coating)', estimatedDays: 2, conditional: true },
  { key: 'glass_electricals', label: 'Glass & Electricals', estimatedDays: 1 },
  { key: 'internal_inspection', label: 'Internal Inspection', estimatedDays: 1 },
  { key: 'external_inspection', label: 'External Inspection (if required)', estimatedDays: 1, conditional: true },
  { key: 'packing_dispatch', label: 'Packing & Dispatch', estimatedDays: 1 },
]

export function getStageLabel(stageId: string) {
  return STAGES.find(s => s.id === stageId)?.label || stageId
}

export function getStageColor(stageId: string) {
  return STAGES.find(s => s.id === stageId)?.color || 'bg-gray-100 text-gray-800'
}

export const ROLES: Record<string, string> = {
  director: 'Director',
  vp: 'VP / Assistant',
  accounts: 'Accounts & Finance',
  manufacturing: 'Manufacturing Head',
  design: 'Design Head',
  sales: 'Sales Executive',
  sales_director: 'Sales Director',
}
