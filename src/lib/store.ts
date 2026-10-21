import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { seedTransactions } from './fixtures'
import type { DemoState, Guardian, Incident, IncidentStatus, Transaction } from './types'

interface QuantoStore extends DemoState {
  submitCompletedPayment: (transaction: Transaction) => void
  submitDecoyPayment: (transaction: Transaction, incident: Incident) => void
  resolveIncident: (incidentId: string, status: Exclude<IncidentStatus, 'open'>) => void
  setGuardian: (guardian: Guardian) => void
  setPins: (normalPin: string, duressPin: string) => void
  resetDemo: () => void
}

function createInitialState(): DemoState {
  return {
    owner: {
      name: 'Ada Okafor',
      firstName: 'Ada',
      accountMask: '•••• 4821',
    },
    balance: 842500,
    normalPin: '1234',
    duressPin: '9111',
    guardian: {
      name: 'Tunde Bello',
      phone: '+234 803 ••• 4821',
      enabled: true,
    },
    transactions: structuredClone(seedTransactions),
    incidents: [],
  }
}

export const useQuantoStore = create<QuantoStore>()(
  persist(
    (set) => ({
      ...createInitialState(),

      submitCompletedPayment: (transaction) =>
        set((state) => ({
          balance: state.balance - transaction.amount,
          transactions: [transaction, ...state.transactions],
        })),

      submitDecoyPayment: (transaction, incident) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions],
          incidents: [incident, ...state.incidents],
        })),

      resolveIncident: (incidentId, status) =>
        set((state) => {
          const incident = state.incidents.find((item) => item.id === incidentId)
          if (!incident || incident.status !== 'open') return state

          const transaction = state.transactions.find(
            (item) => item.id === incident.transactionId,
          )
          if (!transaction) return state

          const release = status === 'released'
          return {
            balance: release ? state.balance - transaction.amount : state.balance,
            incidents: state.incidents.map((item) =>
              item.id === incidentId ? { ...item, status } : item,
            ),
            transactions: state.transactions.map((item) =>
              item.id === transaction.id
                ? {
                    ...item,
                    status: release ? 'completed' : 'cancelled',
                    decoy: false,
                  }
                : item,
            ),
          }
        }),

      setGuardian: (guardian) => set({ guardian }),

      setPins: (normalPin, duressPin) => set({ normalPin, duressPin }),

      resetDemo: () => set(createInitialState()),
    }),
    {
      name: 'quanto-duress-demo-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export function selectHeldTotal(state: DemoState) {
  return state.incidents
    .filter((incident) => incident.status === 'open')
    .reduce((total, incident) => {
      const transaction = state.transactions.find(
        (item) => item.id === incident.transactionId,
      )
      return total + (transaction?.amount ?? 0)
    }, 0)
}

export function selectAvailableBalance(state: DemoState) {
  return state.balance - selectHeldTotal(state)
}

export function selectOpenIncident(state: DemoState) {
  return state.incidents.find((incident) => incident.status === 'open')
}
