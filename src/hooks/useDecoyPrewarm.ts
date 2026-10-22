import { useEffect } from 'react'
import { primeDuressDecoy } from '@/lib/decoyLedger'
import { duressBalanceFor, useBankingStore } from '@/lib/store'

export function useDecoyPrewarm() {
  const accountNumber = useBankingStore((state) => state.owner.accountNumber)
  const balance = useBankingStore((state) => state.balance)
  const monthlyBudget = useBankingStore((state) => state.monthlyBudget)
  const duress = useBankingStore((state) => state.duress)
  const duressActive = useBankingStore((state) => state.duressActive)
  const silentFailureActive = useBankingStore((state) => state.silentFailureActive)

  useEffect(() => {
    if (
      !accountNumber ||
      !duress ||
      duress.historyMode !== 'decoy' ||
      duressActive ||
      silentFailureActive
    ) {
      return
    }

    const warm = () => {
      void primeDuressDecoy(
        duressBalanceFor(balance, duress),
        monthlyBudget,
      )
    }

    warm()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') warm()
    }

    window.addEventListener('online', warm)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('online', warm)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [
    accountNumber,
    balance,
    duress,
    duressActive,
    monthlyBudget,
    silentFailureActive,
  ])
}
