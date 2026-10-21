import type { PaymentInput, RiskSignal } from './types'

function randomRef(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}

export function buildDuressSignals(
  input: PaymentInput,
  balance: number,
  isNewRecipient: boolean,
): { signals: RiskSignal[]; score: number } {
  const exposure = Math.min(Math.round((input.amount / Math.max(balance, 1)) * 100), 100)
  const hour = new Date().getHours()
  const entrySeconds = Math.max(input.pinEntryMs / 1000, 0.1)

  const signals: RiskSignal[] = [
    {
      label: 'Duress PIN',
      value: 'Silent trigger confirmed',
      tone: 'danger',
    },
    {
      label: 'Balance exposure',
      value: `${exposure}% of available balance`,
      tone: exposure >= 50 ? 'danger' : exposure >= 25 ? 'warning' : 'neutral',
    },
    {
      label: 'Recipient',
      value: isNewRecipient ? 'First-time recipient' : 'Seen in past transfers',
      tone: isNewRecipient ? 'warning' : 'neutral',
    },
    {
      label: 'PIN entry speed',
      value: `${entrySeconds.toFixed(1)}s — ${entrySeconds < 4 ? 'unusually fast' : 'within normal range'}`,
      tone: entrySeconds < 4 ? 'warning' : 'neutral',
    },
    {
      label: 'PIN corrections',
      value: input.corrections === 0 ? 'None' : `${input.corrections} corrected digit${input.corrections === 1 ? '' : 's'}`,
      tone: input.corrections >= 3 ? 'warning' : 'neutral',
    },
    {
      label: 'Transfer window',
      value: hour >= 22 || hour < 6 ? 'Unusual hour' : 'Normal hour',
      tone: hour >= 22 || hour < 6 ? 'warning' : 'neutral',
    },
  ]

  const score = 96
  return { signals, score }
}

export function guardianReference() {
  return randomRef('QG')
}

export function transactionReference() {
  return randomRef('QX')
}

export function incidentReference() {
  return randomRef('QI')
}
