import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  beneficiaries as seedBeneficiaries,
  owner as seedOwner,
  seedTransactions,
} from './fixtures'
import type {
  BankingState,
  Beneficiary,
  DuressSettings,
  Transaction,
  UnlockResult,
} from './types'

interface BankingStore extends BankingState {
  commitTransfer: (transaction: Transaction, beneficiary?: Beneficiary) => void
  setPin: (pin: string) => void
  setDuressSettings: (settings: DuressSettings | null) => void
  unlockWithPin: (pin: string) => UnlockResult
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
    duress: null,
    duressActive: false,
    duressBalance: 0,
  }
}

function duressBalanceFor(balance: number, settings: DuressSettings) {
  const value =
    settings.mode === 'amount'
      ? settings.value
      : Math.round((balance * settings.value) / 100)
  return Math.max(0, Math.min(Math.round(value), balance))
}

export const useBankingStore = create<BankingStore>()(
  persist(
    (set, get) => ({
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
            duressBalance: state.duressActive
              ? Math.max(0, state.duressBalance - transaction.amount)
              : state.duressBalance,
            transactions: [transaction, ...state.transactions],
            beneficiaries:
              beneficiary && !exists
                ? [beneficiary, ...state.beneficiaries]
                : state.beneficiaries,
          }
        }),

      setPin: (pin) => set({ pin }),

      setDuressSettings: (settings) =>
        set((state) =>
          state.duressActive
            ? state
            : {
                duress: settings,
                duressActive: false,
                duressBalance: 0,
              },
        ),

      unlockWithPin: (pin) => {
        const state = get()

        if (pin === state.pin) {
          if (state.duressActive) {
            set({ duressActive: false, duressBalance: 0 })
          }
          return 'normal'
        }

        if (state.duress && pin === state.duress.pin && pin !== state.pin) {
          if (!state.duressActive) {
            set({
              duressActive: true,
              duressBalance: duressBalanceFor(state.balance, state.duress),
            })
          }
          return 'duress'
        }

        return null
      },

      resetDemo: () => set(createInitialState()),
    }),
    {
      name: 'quanto-banking-demo-v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<BankingState>
        if (version < 2) {
          return {
            ...state,
            duress: null,
            duressActive: false,
            duressBalance: 0,
          }
        }
        return state as BankingState
      },
    },
  ),
)

function inCurrentMonth(value: string) {
  const date = new Date(value)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export function selectAvailableBalance(state: BankingState) {
  return state.duressActive ? state.duressBalance : state.balance
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
