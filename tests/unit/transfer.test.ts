import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitTransfer } from '../../src/lib/api'
import { useBankingStore } from '../../src/lib/store'
import type { Beneficiary, TransferInput } from '../../src/lib/types'

const recipient: Beneficiary = {
  id: 'ben_test',
  name: 'Test Recipient',
  bank: 'GTBank',
  accountNumber: '0000000000',
  initials: 'TR',
}

function transferInput(overrides: Partial<TransferInput> = {}): TransferInput {
  return {
    beneficiary: recipient,
    amount: 1_000,
    note: 'Unit test transfer',
    pin: '1234',
    ...overrides,
  }
}

function activateDuress(value = 50_000) {
  const store = useBankingStore.getState()
  store.setDuressSettings({
    pin: '4321',
    mode: 'amount',
    value,
    historyMode: 'real',
  })
  expect(store.unlockWithPin('4321')).toBe('duress')
}

async function runTransfer(input: TransferInput) {
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    const promise = submitTransfer(input)
    await vi.runAllTimersAsync()
    return await promise
  } finally {
    vi.useRealTimers()
  }
}

async function expectTransferFailure(input: TransferInput, message: RegExp) {
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    const promise = submitTransfer(input)
    const assertion = expect(promise).rejects.toThrow(message)
    await vi.runAllTimersAsync()
    await assertion
  } finally {
    vi.useRealTimers()
  }
}

beforeEach(() => {
  useBankingStore.getState().resetDemo()
})

describe('submitTransfer caps', () => {
  it('rejects a transfer one naira above the normal balance without debiting', async () => {
    const before = useBankingStore.getState()
    const transactionCount = before.transactions.length

    await expectTransferFailure(
      transferInput({ amount: before.balance + 1 }),
      /above your available balance/,
    )

    const after = useBankingStore.getState()
    expect(after.balance).toBe(before.balance)
    expect(after.transactions).toHaveLength(transactionCount)
  })

  it('allows a transfer exactly at the normal balance', async () => {
    const before = useBankingStore.getState().balance
    const result = await runTransfer(transferInput({ amount: before }))

    expect(result.transaction.status).toBe('completed')
    expect(useBankingStore.getState().balance).toBe(0)
  })

  it('enforces the duress cap instead of the real balance', async () => {
    activateDuress(50_000)
    const before = useBankingStore.getState()

    await expectTransferFailure(
      transferInput({ amount: 50_001, pin: '4321' }),
      /above your available balance/,
    )

    const after = useBankingStore.getState()
    expect(after.duressBalance).toBe(50_000)
    expect(after.balance).toBe(before.balance)
  })

  it('debits both ledgers when transferring exactly at the duress cap', async () => {
    activateDuress(50_000)
    const before = useBankingStore.getState().balance

    const result = await runTransfer(
      transferInput({ amount: 50_000, pin: '4321' }),
    )

    const after = useBankingStore.getState()
    expect(result.transaction.status).toBe('completed')
    expect(after.duressBalance).toBe(0)
    expect(after.balance).toBe(before - 50_000)
  })

  it('blocks every transfer when the duress balance is zero', async () => {
    activateDuress(0)

    await expectTransferFailure(
      transferInput({ amount: 1, pin: '4321' }),
      /no money available/,
    )
    expect(useBankingStore.getState().duressBalance).toBe(0)
  })

  it('rejects a wrong PIN without debiting either ledger', async () => {
    activateDuress(50_000)
    const before = useBankingStore.getState()

    await expectTransferFailure(
      transferInput({ amount: 1_000, pin: '0000' }),
      /PIN is not correct/,
    )

    const after = useBankingStore.getState()
    expect(after.balance).toBe(before.balance)
    expect(after.duressBalance).toBe(before.duressBalance)
  })

  it('rejects zero and negative amounts', async () => {
    await expectTransferFailure(
      transferInput({ amount: 0 }),
      /greater than zero/,
    )
    await expectTransferFailure(
      transferInput({ amount: -500 }),
      /greater than zero/,
    )
    expect(useBankingStore.getState().balance).toBe(842_500)
  })
})

describe('submitTransfer side effects', () => {
  it('fails with a fake network error and no debit when silent failure is active', async () => {
    const store = useBankingStore.getState()
    store.setSilentFailureSettings({
      shake: false,
      voice: false,
      phrase: 'access my account now',
      recoveryPin: '9999',
      recoveryUsesDuressPin: false,
    })
    activateDuress(50_000)
    const before = useBankingStore.getState()

    await expectTransferFailure(
      transferInput({ amount: 1_000, pin: '4321' }),
      /couldn't reach the network/,
    )

    const after = useBankingStore.getState()
    expect(after.silentFailureActive).toBe(true)
    expect(after.balance).toBe(before.balance)
    expect(after.duressBalance).toBe(before.duressBalance)
    expect(after.transactions[0]?.status).toBe('failed')
  })

  it('does not duplicate an existing beneficiary', async () => {
    const existing = useBankingStore.getState().beneficiaries[0]!
    const count = useBankingStore.getState().beneficiaries.length

    await runTransfer(
      transferInput({
        beneficiary: existing,
        amount: 1_000,
        note: '',
      }),
    )

    const after = useBankingStore.getState()
    expect(after.beneficiaries).toHaveLength(count)
    expect(after.transactions[0]?.description).toBe('Transfer')
  })

  it('adds a new beneficiary and records the completed transaction', async () => {
    const count = useBankingStore.getState().beneficiaries.length
    const result = await runTransfer(transferInput())

    const after = useBankingStore.getState()
    expect(after.beneficiaries).toHaveLength(count + 1)
    expect(after.beneficiaries[0]).toEqual(result.beneficiary)
    expect(after.transactions[0]).toEqual(result.transaction)
    expect(after.balance).toBe(842_500 - 1_000)
  })
})
