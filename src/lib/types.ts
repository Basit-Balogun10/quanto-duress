export type TransactionDirection = 'in' | 'out'

export type TransactionCategory =
  | 'income'
  | 'transfer'
  | 'food'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'savings'
  | 'other'

export type TransactionStatus = 'completed' | 'pending' | 'failed'

export interface Transaction {
  id: string
  direction: TransactionDirection
  amount: number
  counterparty: string
  bank: string
  accountNumber?: string
  description: string
  category: TransactionCategory
  createdAt: string
  status: TransactionStatus
  reference: string
}

export interface Beneficiary {
  id: string
  name: string
  bank: string
  accountNumber: string
  initials: string
  favorite?: boolean
}

export interface Owner {
  name: string
  firstName: string
  accountNumber: string
  bank: string
  initials: string
}

export interface BankingState {
  owner: Owner
  balance: number
  pin: string
  monthlyBudget: number
  beneficiaries: Beneficiary[]
  transactions: Transaction[]
}

export interface TransferInput {
  beneficiary: Beneficiary
  amount: number
  note: string
  pin: string
}

export interface TransferResult {
  transaction: Transaction
  beneficiary: Beneficiary
}
