import { useEffect, useRef } from 'react'
import { playSilentFailureCue } from '@/lib/silentFailureCue'
import { useBankingStore } from '@/lib/store'

export function useSilentFailureCue() {
  const active = useBankingStore((state) => state.silentFailureActive)
  const previous = useRef(active)

  useEffect(() => {
    if (active && !previous.current) playSilentFailureCue()
    previous.current = active
  }, [active])
}
