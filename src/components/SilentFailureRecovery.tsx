import { useEffect, useState } from 'react'
import { RecoveryDialog } from './RecoveryDialog'
import { onSilentFailureRecovery } from '@/lib/silentFailureCue'
import { useBankingStore } from '@/lib/store'

function ActiveSilentFailureRecovery() {
  const [open, setOpen] = useState(false)

  useEffect(() => onSilentFailureRecovery(() => setOpen(true)), [])

  if (!open) return null

  return <RecoveryDialog onClose={() => setOpen(false)} />
}

export function SilentFailureRecovery() {
  const active = useBankingStore((state) => state.silentFailureActive)
  return active ? <ActiveSilentFailureRecovery /> : null
}
