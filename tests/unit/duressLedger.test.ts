import { describe, expect, it } from 'vitest'
import {
  createDuressLedger,
  DuressLedgerValidationError,
  validateDuressLedger,
} from '../../src/lib/duressLedger'
import type { Transaction } from '../../src/lib/types'

function netTotal(transactions: Transaction[]) {
  return transactions.reduce(
    (total, transaction) =>
      total + (transaction.direction === 'in' ? transaction.amount : -transaction.amount),
    0,
  )
}

function generatedLedger(balance = 50_000) {
  return createDuressLedger(balance, 300_000)
}

describe('createDuressLedger', () => {
  it.each([0, 1_000, 50_000, 842_500])(
    'creates a balanced ledger for %i naira',
    (balance) => {
      const ledger = createDuressLedger(balance, 300_000)
      const validated = validateDuressLedger(ledger, balance)

      expect(validated).toHaveLength(ledger.length)
      expect(netTotal(validated)).toBe(balance)
      expect(new Set(validated.map((transaction) => transaction.id)).size).toBe(
        validated.length,
      )
      expect(
        new Set(validated.map((transaction) => transaction.reference)).size,
      ).toBe(validated.length)
      expect(validated.some((transaction) => transaction.direction === 'in')).toBe(
        true,
      )
      expect(validated.some((transaction) => transaction.direction === 'out')).toBe(
        true,
      )
      expect(validated.every((transaction) => transaction.status === 'completed')).toBe(
        true,
      )
    },
  )

  it('keeps every amount a positive whole naira amount', () => {
    const ledger = generatedLedger()

    for (const transaction of ledger) {
      expect(Number.isInteger(transaction.amount)).toBe(true)
      expect(transaction.amount).toBeGreaterThan(0)
    }
  })

  it('sorts transactions newest first', () => {
    const ledger = generatedLedger()
    const timestamps = ledger.map((transaction) => Date.parse(transaction.createdAt))

    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a))
  })

  it('still presents a believable salary and spending history at zero balance', () => {
    const ledger = generatedLedger(0)
    const incoming = ledger
      .filter((transaction) => transaction.direction === 'in')
      .reduce((total, transaction) => total + transaction.amount, 0)
    const outgoing = ledger
      .filter((transaction) => transaction.direction === 'out')
      .reduce((total, transaction) => total + transaction.amount, 0)

    expect(incoming).toBeGreaterThan(0)
    expect(outgoing).toBeGreaterThan(0)
    expect(netTotal(ledger)).toBe(0)
  })

  it('never introduces a transaction dated in the future', () => {
    const now = Date.now()

    for (const transaction of generatedLedger()) {
      expect(Date.parse(transaction.createdAt)).toBeLessThanOrEqual(now + 5 * 60 * 1000)
    }
  })
})

describe('validateDuressLedger', () => {
  it('rejects a ledger whose net total does not match the balance', () => {
    const ledger = generatedLedger()
    ledger[0] = { ...ledger[0]!, amount: ledger[0]!.amount + 1 }

    expect(() => validateDuressLedger(ledger, 50_000)).toThrow(
      DuressLedgerValidationError,
    )
    expect(() => validateDuressLedger(ledger, 50_000)).toThrow(/net to/)
  })

  it('rejects duplicate ids and references', () => {
    const duplicateIds = generatedLedger()
    duplicateIds[1] = { ...duplicateIds[1]!, id: duplicateIds[0]!.id }

    expect(() => validateDuressLedger(duplicateIds, 50_000)).toThrow(/duplicate id/)

    const duplicateReferences = generatedLedger()
    duplicateReferences[1] = {
      ...duplicateReferences[1]!,
      reference: duplicateReferences[0]!.reference,
    }

    expect(() => validateDuressLedger(duplicateReferences, 50_000)).toThrow(
      /duplicate reference/,
    )
  })

  it.each<[string, (transaction: Transaction) => Transaction]>([
    ['a negative amount', (transaction) => ({ ...transaction, amount: -1 })],
    ['a fractional amount', (transaction) => ({ ...transaction, amount: 12.5 })],
    ['an invalid direction', (transaction) => ({
      ...transaction,
      direction: 'sideways' as Transaction['direction'],
    })],
    ['an invalid category', (transaction) => ({
      ...transaction,
      category: 'crypto' as Transaction['category'],
    })],
    ['a non-completed status', (transaction) => ({ ...transaction, status: 'failed' })],
    ['an invalid date', (transaction) => ({ ...transaction, createdAt: 'not-a-date' })],
    ['a future date', (transaction) => ({
      ...transaction,
      createdAt: new Date(Date.now() + 86_400_000).toISOString(),
    })],
    ['an empty counterparty', (transaction) => ({ ...transaction, counterparty: ' ' })],
    ['an empty description', (transaction) => ({ ...transaction, description: '' })],
    ['an empty reference', (transaction) => ({ ...transaction, reference: '' })],
    ['an invalid account number', (transaction) => ({
      ...transaction,
      accountNumber: 'not-an-account',
    })],
  ])('rejects a ledger with %s', (_label, mutate) => {
    const ledger = generatedLedger()
    ledger[0] = mutate(ledger[0]!)

    expect(() => validateDuressLedger(ledger, 50_000)).toThrow(
      DuressLedgerValidationError,
    )
  })

  it('rejects ledgers that are too short, too long, or not arrays', () => {
    const ledger = generatedLedger()

    expect(() => validateDuressLedger([ledger[0]], 50_000)).toThrow(/at least/)
    expect(() =>
      validateDuressLedger(Array.from({ length: 41 }, () => ledger[0]!), 50_000),
    ).toThrow(/at most/)
    expect(() => validateDuressLedger({ transactions: ledger }, 50_000)).toThrow(
      /array/,
    )
  })

  it('rejects invalid expected balances', () => {
    expect(() => validateDuressLedger(generatedLedger(), -1)).toThrow(
      /Expected balance/,
    )
    expect(() => validateDuressLedger(generatedLedger(), 12.5)).toThrow(
      /Expected balance/,
    )
  })
})
