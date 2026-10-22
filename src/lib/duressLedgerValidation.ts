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
