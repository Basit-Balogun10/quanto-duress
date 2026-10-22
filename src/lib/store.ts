import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  clearDuressDecoyCache,
  getCachedDuressLedger,
  setDecoyCacheScope,
} from './decoyLedger'
import { createDuressLedger } from './duressLedger'
import type {
  BankingState,
  Beneficiary,
  DuressSettings,
  Owner,
  SilentFailureSettings,
  SilentFailureTrigger,
  Transaction,
  UnlockResult,
} from './types'

interface BankingStore extends BankingState {
  commitTransfer: (transaction: Transaction, beneficiary?: Beneficiary) => void
  recordFailedTransfer: (transaction: Transaction) => void
  fundAccount: (amount: number) => void
  setPin: (pin: string) => void
  setDuressSettings: (settings: DuressSettings | null) => void
  setSilentFailureSettings: (settings: SilentFailureSettings | null) => void
  triggerSilentFailure: (trigger: SilentFailureTrigger) => void
  clearSilentFailure: (pin: string) => boolean
  unlockWithPin: (pin: string) => UnlockResult
}

export const ACTIVE_ACCOUNT_KEY = 'quanto-active-account-v1'
export const ACCOUNT_STATE_PREFIX = 'quanto-account-state-v1:'

const BLANK_OWNER: Owner = {
  name: '',
  firstName: '',
  accountNumber: '',
  bank: 'Quanto',
  initials: '',
}

function readActiveAccountId() {
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY)
  } catch {
    return null
  }
}

let activeAccountId = readActiveAccountId()

setDecoyCacheScope(activeAccountId)

export function accountStateKey(accountId: string) {
  return `${ACCOUNT_STATE_PREFIX}${accountId}`
}

export function getActiveAccountId() {
  return activeAccountId
}

export function setActiveAccountStateId(accountId: string | null) {
  activeAccountId = accountId
  setDecoyCacheScope(accountId)
}

export function rememberActiveAccountId(accountId: string) {
  setActiveAccountStateId(accountId)
  try {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId)
  } catch {
    return
  }
}

export function forgetActiveAccountId() {
  setActiveAccountStateId(null)
  try {
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY)
  } catch {
    return
  }
}

const accountScopedStorage = {
  getItem: (_name: string) => {
    if (!activeAccountId) return null
    try {
      return localStorage.getItem(accountStateKey(activeAccountId))
    } catch {
      return null
    }
  },
  setItem: (_name: string, value: string) => {
    if (!activeAccountId) return
    try {
      localStorage.setItem(accountStateKey(activeAccountId), value)
    } catch {
      return
    }
  },
  removeItem: (_name: string) => {
    if (!activeAccountId) return
    try {
      localStorage.removeItem(accountStateKey(activeAccountId))
    } catch {
      return
    }
  },
}

export function createInitialState(owner: Owner, pin: string): BankingState {
  return {
    owner,
    balance: 0,
    pin,
    monthlyBudget: 300000,
    beneficiaries: [],
    transactions: [],
    duress: null,
    duressActive: false,
    duressBalance: 0,
    duressTransactions: [],
    silentFailure: null,
    silentFailureActive: false,
    silentFailureTrigger: null,
    silentFailureAt: null,
  }
}

const TRIGGER_COOLDOWN_MS = 1500
let lastTriggerAttempt = 0

export function duressBalanceFor(balance: number, settings: DuressSettings) {
  const value =
    settings.mode === 'amount'
      ? settings.value
      : Math.round((balance * settings.value) / 100)
  return Math.max(0, Math.min(Math.round(value), balance))
}

export const useBankingStore = create<BankingStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(BLANK_OWNER, ''),

      commitTransfer: (transaction, beneficiary) =>
        set((state) => {
          const exists = beneficiary
            ? state.beneficiaries.some(
                (item) =>
                  item.accountNumber === beneficiary.accountNumber &&
                  item.bank === beneficiary.bank,
              )
            : true
          const showingDecoyHistory =
            state.duressActive && state.duress?.historyMode === 'decoy'

          return {
            balance: state.balance - transaction.amount,
            duressBalance: state.duressActive
              ? Math.max(0, state.duressBalance - transaction.amount)
              : state.duressBalance,
            transactions: [transaction, ...state.transactions],
            duressTransactions: showingDecoyHistory
              ? [transaction, ...state.duressTransactions]
              : state.duressTransactions,
            beneficiaries:
              beneficiary && !exists
                ? [beneficiary, ...state.beneficiaries]
                : state.beneficiaries,
          }
        }),

      recordFailedTransfer: (transaction) =>
        set((state) => {
          const showingDecoyHistory =
            state.duressActive && state.duress?.historyMode === 'decoy'

          return {
            transactions: [transaction, ...state.transactions],
            duressTransactions: showingDecoyHistory
              ? [transaction, ...state.duressTransactions]
              : state.duressTransactions,
          }
        }),

      fundAccount: (amount) =>
        set((state) => {
          if (state.duressActive) return state
          if (!Number.isInteger(amount) || amount <= 0) return state

          const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
          const transaction: Transaction = {
            id: `tx_test_funds_${Date.now()}_${suffix}`,
            direction: 'in',
            amount,
            counterparty: 'Quanto test funds',
            bank: 'Quanto',
            description: 'Test account funding',
            category: 'transfer',
            createdAt: new Date().toISOString(),
            status: 'completed',
            reference: `QX-${suffix}`,
          }

          return {
            balance: state.balance + amount,
            transactions: [transaction, ...state.transactions],
          }
        }),

      setPin: (pin) => set({ pin }),

      setDuressSettings: (settings) =>
        set((state) => {
          if (state.duressActive) return state
          if (!settings) clearDuressDecoyCache()
          return {
            duress: settings,
            duressActive: false,
            duressBalance: 0,
            duressTransactions: [],
            silentFailure:
              !settings && state.silentFailure?.recoveryUsesDuressPin
                ? { ...state.silentFailure, recoveryUsesDuressPin: false }
                : state.silentFailure,
          }
        }),

      setSilentFailureSettings: (settings) => {
        set((state) => {
          if (state.silentFailureActive) return state
          lastTriggerAttempt = 0
          return {
            silentFailure: settings,
            silentFailureActive: false,
            silentFailureTrigger: null,
            silentFailureAt: null,
          }
        })
      },

      triggerSilentFailure: (trigger) =>
        set((state) => {
          if (!state.silentFailure || state.silentFailureActive) return state

          const now = Date.now()
          if (now - lastTriggerAttempt < TRIGGER_COOLDOWN_MS) return state
          lastTriggerAttempt = now

          return {
            silentFailureActive: true,
            silentFailureTrigger: trigger,
            silentFailureAt: new Date().toISOString(),
          }
        }),

      clearSilentFailure: (pin) => {
        const state = get()
        const recoveryPin = selectRecoveryPin(state)
        if (!state.silentFailureActive || !recoveryPin || pin !== recoveryPin) {
          return false
        }
        set({
          silentFailureActive: false,
          silentFailureTrigger: null,
          silentFailureAt: null,
        })
        return true
      },

      unlockWithPin: (pin) => {
        const state = get()

        if (pin === state.pin) {
          if (state.duressActive) {
            set({
              duressActive: false,
              duressBalance: 0,
              duressTransactions: [],
            })
          }
          return 'normal'
        }

        if (state.duress && pin === state.duress.pin && pin !== state.pin) {
          if (!state.duressActive) {
            const duressBalance = duressBalanceFor(state.balance, state.duress)
            const decoyHistory =
              state.duress.historyMode === 'decoy'
                ? (getCachedDuressLedger(duressBalance, state.monthlyBudget) ??
                  createDuressLedger(duressBalance, state.monthlyBudget))
                : []
            set({
              duressActive: true,
              duressBalance,
              duressTransactions: decoyHistory,
            })
          }
          return 'duress'
        }

        return null
      },
    }),
    {
      name: 'quanto-banking',
      version: 4,
      storage: createJSONStorage(() => accountScopedStorage),
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<BankingState>
        const deactivateDuress = version < 3
        const duress =
          version < 2 || !state.duress
            ? null
            : {
                ...state.duress,
                historyMode: state.duress.historyMode ?? 'decoy',
              }

        return {
          ...state,
          duress,
          duressActive: deactivateDuress ? false : (state.duressActive ?? false),
          duressBalance: deactivateDuress ? 0 : (state.duressBalance ?? 0),
          duressTransactions: [],
          silentFailure: state.silentFailure ?? null,
          silentFailureActive: state.silentFailureActive ?? false,
          silentFailureTrigger: state.silentFailureTrigger ?? null,
          silentFailureAt: state.silentFailureAt ?? null,
        } as BankingState
      },
    },
  ),
)

export async function rehydrateActiveAccount() {
  await useBankingStore.persist.rehydrate()
}

function inCurrentMonth(value: string) {
  const date = new Date(value)
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export function selectRecoveryPin(
  state: Pick<BankingState, 'duress' | 'silentFailure'>,
) {
  if (!state.silentFailure) return null
  if (state.silentFailure.recoveryUsesDuressPin && state.duress) {
    return state.duress.pin
  }
  return /^\d{4}$/.test(state.silentFailure.recoveryPin)
    ? state.silentFailure.recoveryPin
    : null
}

export function selectAvailableBalance(state: BankingState) {
  return state.duressActive ? state.duressBalance : state.balance
}

export function selectVisibleTransactions(state: BankingState) {
  return state.duressActive && state.duress?.historyMode === 'decoy'
    ? state.duressTransactions
    : state.transactions
}

export function selectMonthlySpending(state: BankingState) {
  return selectVisibleTransactions(state)
    .filter(
      (transaction) =>
        transaction.direction === 'out' &&
        transaction.status === 'completed' &&
        inCurrentMonth(transaction.createdAt),
    )
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function selectMonthlyIncome(state: BankingState) {
  return selectVisibleTransactions(state)
    .filter(
      (transaction) =>
        transaction.direction === 'in' &&
        transaction.status === 'completed' &&
        inCurrentMonth(transaction.createdAt),
    )
    .reduce((total, transaction) => total + transaction.amount, 0)
}
