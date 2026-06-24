export interface FollowUpConfig {
  stage: string
  label: string
  defaultDays: number
  assignToRole: string[]
  taskTitle: string
}

export const FOLLOWUP_CONFIG: FollowUpConfig[] = [
  { stage: 'inquiry',           label: 'Inquiry Received',   defaultDays: 2,  assignToRole: ['sales', 'vp'], taskTitle: 'Send intro email, brochure & customer list' },
  { stage: 'tds_sent',          label: 'TDS Sent',           defaultDays: 3,  assignToRole: ['sales', 'vp'], taskTitle: 'Follow up on TDS — confirm receipt and queries' },
  { stage: 'quote_sent',        label: 'Quote Sent',         defaultDays: 3,  assignToRole: ['sales', 'vp'], taskTitle: 'Follow up on quote — check if customer has questions' },
  { stage: 'follow_up',         label: 'Negotiation',        defaultDays: 2,  assignToRole: ['sales', 'vp'], taskTitle: 'Negotiation follow-up call' },
  { stage: 'final_quote_sent',  label: 'Final Quote Sent',   defaultDays: 5,  assignToRole: ['sales', 'vp'], taskTitle: 'Follow up — await PO from customer' },
  { stage: 'po_received',       label: 'PO Received',        defaultDays: 1,  assignToRole: ['director'],    taskTitle: 'Review and vet the Purchase Order' },
  { stage: 'po_vetted',         label: 'PO Vetted',          defaultDays: 1,  assignToRole: ['accounts'],   taskTitle: 'Generate Proforma Invoice and send to customer' },
  { stage: 'pi_sent',           label: 'PI Sent',            defaultDays: 3,  assignToRole: ['sales', 'vp'], taskTitle: 'Follow up on PI — check approval and advance payment' },
  { stage: 'approval_pending',  label: 'Approval Pending',   defaultDays: 2,  assignToRole: ['accounts'],   taskTitle: 'Confirm advance payment received from customer' },
  { stage: 'production',        label: 'In Production',      defaultDays: 7,  assignToRole: ['manufacturing'], taskTitle: 'Update production progress and flag any issues' },
  { stage: 'dispatch_ready',    label: 'Ready for Dispatch', defaultDays: 1,  assignToRole: ['director', 'accounts'], taskTitle: 'Arrange dispatch — confirm logistics and billing' },
  { stage: 'dispatched',        label: 'Dispatched',         defaultDays: 3,  assignToRole: ['sales', 'vp'], taskTitle: 'Call customer to confirm receipt and installation date' },
  { stage: 'installation',      label: 'Installation',       defaultDays: 5,  assignToRole: ['sales', 'vp'], taskTitle: 'Follow up after installation — get feedback' },
  { stage: 'completed',         label: 'Completed',          defaultDays: 30, assignToRole: ['sales', 'vp'], taskTitle: 'Post-sale check-in — ask for referral or repeat business' },
]
