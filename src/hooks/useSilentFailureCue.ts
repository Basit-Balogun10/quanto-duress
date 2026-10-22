import { useEffect, useRef } from 'react'
import {
  playSilentFailureCue,
  primeSilentFailureCueSound,
} from '@/lib/silentFailureCue'
import { useBankingStore } from '@/lib/store'

export function useSilentFailureCue() {
  const active = useBankingStore((state) => state.silentFailureActive)
  const muted = useBankingStore(
    (state) => state.silentFailure?.muteSound ?? false,
  )
  const soundArmed = useBankingStore(
    (state) => Boolean(state.silentFailure) && !muted,
  )
  const previous = useRef(active)

  useEffect(() => {
    if (active && !previous.current) playSilentFailureCue({ muted })
    previous.current = active
  }, [active, muted])

  useEffect(() => {
    if (!soundArmed) return

    const prime = () => {
      primeSilentFailureCueSound()
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('keydown', prime)
    }

    window.addEventListener('pointerdown', prime)
    window.addEventListener('keydown', prime)
    return () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('keydown', prime)
    }
  }, [soundArmed])
}
