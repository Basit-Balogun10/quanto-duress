import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  beneficiaries as seedBeneficiaries,
  owner as seedOwner,
  seedTransactions,
} from './fixtures'
import type { BankingState, Beneficiary, Transaction } from './types'

interface BankingStore extends BankingState {
  commitTransfer: (transaction: Transaction, beneficiary?: Beneficiary) => void
  setPin: (pin: string) => void
  resetDemo: () => void
}

function createInitialState(): BankingState {
  return {
    owner: seedOwner,
    balance: 842500,
    pin: '1234',
    monthlyBudget: 300000,
    beneficiaries: structuredClone(seedBeneficiaries),
    transactions: structuredClone(seedTransactions),
  }
}

export const useBankingStore = create<BankingStore>()(
  persist(
    (set) => ({
      ...createInitialState(),

      commitTransfer: (transaction, beneficiary) =>
        set((state) => {
          const exists = beneficiary
            ? state.beneficiaries.some(
                (item) =>
                  item.accountNumber === beneficiary.accountNumber &&
                  item.bank === beneficiary.bank,
              )
            : true

          return {
            balance: state.balance - transaction.amount,
            transactions: [transaction, ...state.transactions],
            beneficiaries:
              beneficiary && !exists
                ? [beneficiary, ...state.beneficiaries]
                : state.beneficiaries,
          }
        }),

      setPin: (pin) => set({ pin }),

      resetDemo: () => set(createInitialState()),
    }),
    {
      name: 'quanto-banking-demo-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

function inCurrentMonth(value: string) {
  const date = new Date(value)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export function selectMonthlySpending(state: BankingState) {
  return state.transactions
    .filter(
      (transaction) =>
        transaction.direction === 'out' &&
        transaction.status === 'completed' &&
        inCurrentMonth(transaction.createdAt),
    )
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function selectMonthlyIncome(state: BankingState) {
  return state.transactions
    .filter(
      (transaction) =>
        transaction.direction === 'in' &&
        transaction.status === 'completed' &&
        inCurrentMonth(transaction.createdAt),
    )
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function selectAvailableBalance(state: BankingState) {
  return state.balance
}
