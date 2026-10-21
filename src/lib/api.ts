import { useQuantoStore, selectAvailableBalance, selectHeldTotal } from './store'
import {
  buildDuressSignals,
  guardianReference,
  incidentReference,
  transactionReference,
} from './risk'
import type { Incident, PaymentInput, PaymentResult, Transaction } from './types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export class PaymentError extends Error {}

function isNewRecipient(recipientId: string, recipientName: string) {
  const { transactions } = useQuantoStore.getState()
  return !transactions.some(
    (transaction) =>
      transaction.direction === 'out' &&
      (transaction.recipientId === recipientId ||
        transaction.recipientName.toLowerCase() === recipientName.toLowerCase()),
  )
}

export async function submitPayment(input: PaymentInput): Promise<PaymentResult> {
  await sleep(850)

  const state = useQuantoStore.getState()
  const isNormalPin = input.pin === state.normalPin
  const isDuressPin = input.pin === state.duressPin

  if (!isNormalPin && !isDuressPin) {
    throw new PaymentError('That PIN is not correct. Try again.')
  }

  const available = selectAvailableBalance(state)
  if (input.amount <= 0) {
    throw new PaymentError('Enter an amount greater than zero.')
  }
  if (input.amount > available) {
    throw new PaymentError('This amount is above your available balance.')
  }

  const baseTransaction: Transaction = {
    id: transactionReference(),
    direction: 'out',
    recipientId: input.recipient.id,
    recipientName: input.recipient.name,
    recipientBank: input.recipient.bank,
    amount: input.amount,
    note: input.note || 'Transfer',
    createdAt: new Date().toISOString(),
    status: 'completed',
  }

  if (isDuressPin) {
    const { signals, score } = buildDuressSignals(
      input,
      state.balance - selectHeldTotal(state),
      isNewRecipient(input.recipient.id, input.recipient.name),
    )
    const incident: Incident = {
      id: incidentReference(),
      transactionId: baseTransaction.id,
      createdAt: new Date().toISOString(),
      status: 'open',
      risk: 'critical',
      score,
      signals,
      guardianAlert: {
        channel: 'SMS',
        status: state.guardian.enabled ? 'sent' : 'queued',
        reference: guardianReference(),
        sentAt: new Date().toISOString(),
      },
    }

    const transaction = { ...baseTransaction, decoy: true }
    state.submitDecoyPayment(transaction, incident)
    return { outcome: 'decoy', transaction, incident }
  }

  state.submitCompletedPayment(baseTransaction)
  return { outcome: 'completed', transaction: baseTransaction }
}

export async function resolveHeldPayment(
  incidentId: string,
  action: 'release' | 'cancel',
  normalPin?: string,
) {
  await sleep(700)
  const state = useQuantoStore.getState()
  const incident = state.incidents.find((item) => item.id === incidentId)
  if (!incident || incident.status !== 'open') {
    throw new PaymentError('This security hold is no longer active.')
  }

  if (action === 'release') {
    if (normalPin !== state.normalPin) {
      throw new PaymentError('Enter your normal PIN to release this payment.')
    }
    const transaction = state.transactions.find(
      (item) => item.id === incident.transactionId,
    )
    if (!transaction || transaction.amount > state.balance) {
      throw new PaymentError('Your balance is too low to release this payment.')
    }
    state.resolveIncident(incidentId, 'released')
    return { status: 'released' as const }
  }

  state.resolveIncident(incidentId, 'cancelled')
  return { status: 'cancelled' as const }
}
