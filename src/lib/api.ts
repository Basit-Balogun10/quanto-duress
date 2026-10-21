import { selectAvailableBalance, useBankingStore } from './store'
import type { Beneficiary, Transaction, TransferInput, TransferResult } from './types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class TransferError extends Error {}
export class NetworkError extends Error {}

function transferReference() {
  return `QX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

function beneficiaryId() {
  return `ben_${Math.random().toString(36).slice(2, 8)}`
}

function buildTransaction(
  input: TransferInput,
  beneficiary: Beneficiary,
  status: Transaction['status'],
): Transaction {
  return {
    id: `tx_${Date.now()}`,
    direction: 'out',
    amount: input.amount,
    counterparty: beneficiary.name,
    bank: beneficiary.bank,
    accountNumber: beneficiary.accountNumber,
    description: input.note.trim() || 'Transfer',
    category: 'transfer',
    createdAt: new Date().toISOString(),
    status,
    reference: transferReference(),
  }
}

export async function submitTransfer(input: TransferInput): Promise<TransferResult> {
  await sleep(850)

  const state = useBankingStore.getState()
  const normalPin = input.pin === state.pin
  const duressPin =
    state.duressActive && Boolean(state.duress) && input.pin === state.duress?.pin

  if (input.amount <= 0) {
    throw new TransferError('Enter an amount greater than zero.')
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

  if (state.silentFailure && duressPin) {
    state.triggerSilentFailure('duress-pin')
  }

  const current = useBankingStore.getState()
  if (current.silentFailureActive) {
    current.recordFailedTransfer(buildTransaction(input, beneficiary, 'failed'))
    throw new NetworkError(
      "We couldn't reach the network. Check your connection and try again.",
    )
  }

  if (!normalPin && !duressPin) {
    throw new TransferError('That PIN is not correct. Try again.')
  }

  const available = selectAvailableBalance(current)
  if (input.amount > available) {
    throw new TransferError(
      available === 0
        ? 'There is no money available to send from this account.'
        : 'This amount is above your available balance.',
    )
  }

  const transaction = buildTransaction(input, beneficiary, 'completed')
  current.commitTransfer(transaction, existing ? undefined : beneficiary)

  return { transaction, beneficiary }
}
