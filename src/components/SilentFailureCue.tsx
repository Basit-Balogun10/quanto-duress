import { useEffect, useState } from 'react'
import { onSilentFailureCue } from '@/lib/silentFailureCue'

export function SilentFailureCue() {
  const [pulse, setPulse] = useState(0)

  useEffect(() => onSilentFailureCue(() => setPulse((value) => value + 1)), [])

  useEffect(() => {
    if (!pulse) return
    const timeout = window.setTimeout(() => setPulse(0), 1900)
    return () => window.clearTimeout(timeout)
  }, [pulse])

  if (!pulse) return null

  return (
    <span
      key={pulse}
      aria-hidden="true"
      data-testid="silent-failure-cue"
      className="pointer-events-none fixed right-5 top-5 z-[70] size-2.5 animate-silent-cue rounded-full bg-fathom shadow-[0_0_0_4px_rgba(3,79,70,0.1)]"
    />
  )
}
