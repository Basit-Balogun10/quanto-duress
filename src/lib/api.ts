import { selectAvailableBalance, useBankingStore } from './store'
import type { Beneficiary, Transaction, TransferInput, TransferResult } from './types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class TransferError extends Error {}

function transferReference() {
  return `QX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function beneficiaryId() {
  return `ben_${Math.random().toString(36).slice(2, 8)}`
}

export async function submitTransfer(input: TransferInput): Promise<TransferResult> {
  await sleep(850)

  const state = useBankingStore.getState()

  const normalPin = input.pin === state.pin
  const duressPin = state.duressActive && input.pin === state.duress.pin

  if (!normalPin && !duressPin) {
    throw new TransferError('That PIN is not correct. Try again.')
  }
  if (input.amount <= 0) {
    throw new TransferError('Enter an amount greater than zero.')
  }

  const available = selectAvailableBalance(state)
  if (input.amount > available) {
    throw new TransferError(
      available === 0
        ? 'There is no money available to send from this account.'
        : 'This amount is above your available balance.',
    )
  }

  const existing = state.beneficiaries.find(
    (item) =>
      item.accountNumber === input.beneficiary.accountNumber &&
      item.bank === input.beneficiary.bank,
  )
  const beneficiary: Beneficiary = existing ?? {
    ...input.beneficiary,
    id: beneficiaryId(),
  }

  const transaction: Transaction = {
    id: `tx_${Date.now()}`,
    direction: 'out',
    amount: input.amount,
    counterparty: beneficiary.name,
    bank: beneficiary.bank,
    accountNumber: beneficiary.accountNumber,
    description: input.note.trim() || 'Transfer',
    category: 'transfer',
    createdAt: new Date().toISOString(),
    status: 'completed',
    reference: transferReference(),
  }

  state.commitTransfer(transaction, existing ? undefined : beneficiary)

  return { transaction, beneficiary }
}
