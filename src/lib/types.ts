export type Direction = 'out' | 'in'

export type TransactionStatus = 'completed' | 'held' | 'released' | 'cancelled'

export interface Recipient {
  id: string
  name: string
  bank: string
  accountNumber: string
  initials: string
  trusted?: boolean
}

export interface Transaction {
  id: string
  direction: Direction
  recipientId?: string
  recipientName: string
  recipientBank: string
  amount: number
  note: string
  createdAt: string
  status: TransactionStatus
  decoy?: boolean
}

export interface Guardian {
  name: string
  phone: string
  enabled: boolean
}

export type SignalTone = 'neutral' | 'warning' | 'danger'

export interface RiskSignal {
  label: string
  value: string
  tone: SignalTone
}

export interface GuardianAlert {
  channel: 'SMS'
  status: 'queued' | 'sent'
  reference: string
  sentAt: string
}

export type IncidentStatus = 'open' | 'released' | 'cancelled'

export interface Incident {
  id: string
  transactionId: string
  createdAt: string
  status: IncidentStatus
  risk: 'critical' | 'high' | 'elevated'
  score: number
  signals: RiskSignal[]
  guardianAlert: GuardianAlert
}

export interface PaymentInput {
  amount: number
  recipient: Recipient
  note: string
  pin: string
  pinEntryMs: number
  corrections: number
}

export interface PaymentResult {
  outcome: 'completed' | 'decoy'
  transaction: Transaction
  incident?: Incident
}

export interface DemoState {
  owner: {
    name: string
    firstName: string
    accountMask: string
  }
  balance: number
  normalPin: string
  duressPin: string
  guardian: Guardian
  transactions: Transaction[]
  incidents: Incident[]
}
