import type { Transaction } from './types'

const MIN_LEDGER_ITEMS = 4
const MAX_LEDGER_ITEMS = 40
const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000

const categories = new Set<Transaction['category']>([
  'income',
  'transfer',
  'food',
  'transport',
  'bills',
  'shopping',
  'entertainment',
  'health',
  'savings',
  'other',
])

interface LedgerTemplate {
  counterparty: string
  bank: string
  accountNumber?: string
  description: string
  category: Transaction['category']
  daysAgo: number
  hoursAgo: number
  weight: number
}

const outgoing: LedgerTemplate[] = [
  {
    counterparty: 'Chicken Republic',
    bank: 'Card payment',
    description: 'Lunch with the team',
    category: 'food',
    daysAgo: 0,
    hoursAgo: 3,
    weight: 10,
  },
  {
    counterparty: 'Bolt',
    bank: 'Card payment',
    description: 'Ride to the office',
    category: 'transport',
    daysAgo: 1,
    hoursAgo: 2,
    weight: 6,
  },
  {
    counterparty: 'Mama Ngozi',
    bank: 'GTBank',
    accountNumber: '0123456789',
    description: 'Weekly support',
    category: 'transfer',
    daysAgo: 2,
    hoursAgo: 4,
    weight: 18,
  },
  {
    counterparty: 'GreenLife Pharmacy',
    bank: 'Card payment',
    description: 'Prescription refill',
    category: 'health',
    daysAgo: 3,
    hoursAgo: 1,
    weight: 7,
  },
  {
    counterparty: 'Shoprite',
    bank: 'Card payment',
    description: 'Weekly groceries',
    category: 'shopping',
    daysAgo: 4,
    hoursAgo: 5,
    weight: 20,
  },
  {
    counterparty: 'Tunde Bello',
    bank: 'Access Bank',
    accountNumber: '0987654321',
    description: 'Rent contribution',
    category: 'transfer',
    daysAgo: 5,
    hoursAgo: 2,
    weight: 22,
  },
  {
    counterparty: 'MTN Nigeria',
    bank: 'Bill payment',
    description: '10GB data plan',
    category: 'bills',
    daysAgo: 6,
    hoursAgo: 1,
    weight: 9,
  },
  {
    counterparty: 'Netflix',
    bank: 'Card payment',
    description: 'Monthly subscription',
    category: 'entertainment',
    daysAgo: 7,
    hoursAgo: 6,
    weight: 5,
  },
]

function daysAgo(days: number, hours: number) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString()
}

function reference() {
  return `QX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function monthName() {
  return new Intl.DateTimeFormat('en-NG', { month: 'long' }).format(new Date())
}

export class DuressLedgerValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(`Invalid duress ledger: ${issues.join('; ')}`)
    this.name = 'DuressLedgerValidationError'
    this.issues = issues
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

function parseTransactionDate(value: unknown) {
  if (typeof value !== 'string') return Number.NaN
  return Date.parse(value)
}

export function validateDuressLedger(
  input: unknown,
  expectedBalance: number,
): Transaction[] {
  const issues: string[] = []
  const expectedBalanceValid =
    Number.isInteger(expectedBalance) && expectedBalance >= 0

  if (!expectedBalanceValid) {
    issues.push('Expected balance must be a non-negative whole naira amount.')
  }

  if (!Array.isArray(input)) {
    throw new DuressLedgerValidationError(['Ledger must be an array.'])
  }

  if (input.length < MIN_LEDGER_ITEMS) {
    issues.push(`Ledger must contain at least ${MIN_LEDGER_ITEMS} transactions.`)
  }
  if (input.length > MAX_LEDGER_ITEMS) {
    issues.push(`Ledger must contain at most ${MAX_LEDGER_ITEMS} transactions.`)
  }

  const ids = new Set<string>()
  const references = new Set<string>()
  const now = Date.now()
  let net = 0
  let incomingCount = 0
  let outgoingCount = 0

  input.forEach((value, index) => {
    const label = `Transaction ${index + 1}`

    if (!isRecord(value)) {
      issues.push(`${label} must be an object.`)
      return
    }

    if (!isBoundedString(value.id, 80)) {
      issues.push(`${label} needs a valid id.`)
    } else if (ids.has(value.id)) {
      issues.push(`${label} has a duplicate id.`)
    } else {
      ids.add(value.id)
    }

    const directionValid = value.direction === 'in' || value.direction === 'out'
    if (!directionValid) {
      issues.push(`${label} has an invalid direction.`)
    }

    const amountValid =
      typeof value.amount === 'number' &&
      Number.isInteger(value.amount) &&
      value.amount > 0
    if (!amountValid) {
      issues.push(`${label} needs a positive whole naira amount.`)
    }

    if (directionValid && amountValid) {
      if (value.direction === 'in') {
        incomingCount += 1
        net += value.amount as number
      } else {
        outgoingCount += 1
        net -= value.amount as number
      }
    }

    if (!isBoundedString(value.counterparty, 80)) {
      issues.push(`${label} needs a counterparty.`)
    }
    if (!isBoundedString(value.bank, 80)) {
      issues.push(`${label} needs a bank or payment channel.`)
    }
    if (!isBoundedString(value.description, 160)) {
      issues.push(`${label} needs a description.`)
    }
    if (!isBoundedString(value.reference, 64)) {
      issues.push(`${label} needs a reference.`)
    } else if (references.has(value.reference)) {
      issues.push(`${label} has a duplicate reference.`)
    } else {
      references.add(value.reference)
    }

    if (
      typeof value.category !== 'string' ||
      !categories.has(value.category as Transaction['category'])
    ) {
      issues.push(`${label} has an invalid category.`)
    }

    if (value.status !== 'completed') {
      issues.push(`${label} must be completed.`)
    }

    const createdAt = parseTransactionDate(value.createdAt)
    if (!Number.isFinite(createdAt)) {
      issues.push(`${label} has an invalid date.`)
    } else if (createdAt > now + MAX_FUTURE_DRIFT_MS) {
      issues.push(`${label} cannot be in the future.`)
    }

    if (
      value.accountNumber !== undefined &&
      (typeof value.accountNumber !== 'string' ||
        !/^\d{6,20}$/.test(value.accountNumber))
    ) {
      issues.push(`${label} has an invalid account number.`)
    }
  })

  if (incomingCount === 0) {
    issues.push('Ledger needs at least one incoming transaction.')
  }
  if (outgoingCount === 0) {
    issues.push('Ledger needs at least one outgoing transaction.')
  }
  if (expectedBalanceValid && net !== expectedBalance) {
    issues.push('Transactions must net to the expected balance.')
  }

  if (issues.length > 0) {
    throw new DuressLedgerValidationError(issues)
  }

  return [...(input as Transaction[])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function createDuressLedger(balance: number, monthlyBudget: number): Transaction[] {
  const decoyBalance = Math.max(0, Math.round(balance))
  const spendTarget =
    decoyBalance === 0
      ? Math.min(28000, Math.max(5000, Math.round(monthlyBudget * 0.7)))
      : Math.max(5000, Math.min(Math.round(decoyBalance * 0.55), Math.round(monthlyBudget * 0.7)))
  const totalWeight = outgoing.reduce((total, item) => total + item.weight, 0)
  let allocated = 0

  const spending = outgoing.map((template, index) => {
    const isLast = index === outgoing.length - 1
    const amount = isLast
      ? spendTarget - allocated
      : Math.max(250, Math.round((spendTarget * template.weight) / totalWeight))
    allocated += amount

    return {
      id: `duress_tx_${index + 1}`,
      direction: 'out' as const,
      amount,
      counterparty: template.counterparty,
      bank: template.bank,
      accountNumber: template.accountNumber,
      description: template.description,
      category: template.category,
      createdAt: daysAgo(template.daysAgo, template.hoursAgo),
      status: 'completed' as const,
      reference: reference(),
    }
  })

  const dinnerSplit = Math.max(2500, Math.round(spendTarget * 0.08))
  const salary = decoyBalance + spendTarget - dinnerSplit

  const incoming: Transaction[] = [
    {
      id: 'duress_tx_zara',
      direction: 'in',
      amount: dinnerSplit,
      counterparty: 'Zara Ahmed',
      bank: 'Kuda',
      accountNumber: '2233445566',
      description: 'Dinner split',
      category: 'transfer',
      createdAt: daysAgo(8, 3),
      status: 'completed',
      reference: reference(),
    },
    {
      id: 'duress_tx_salary',
      direction: 'in',
      amount: salary,
      counterparty: 'Salary',
      bank: 'Quanto',
      description: `${monthName()} salary`,
      category: 'income',
      createdAt: daysAgo(10, 1),
      status: 'completed',
      reference: reference(),
    },
  ]

  return validateDuressLedger([...spending, ...incoming], decoyBalance)
}
