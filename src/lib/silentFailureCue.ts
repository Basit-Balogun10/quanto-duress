export const SILENT_FAILURE_CUE_EVENT = 'quanto:silent-failure-cue'
export const SILENT_FAILURE_CUE_PATTERN = [18, 55, 18] as const

export function playSilentFailureCue() {
  if (typeof window === 'undefined') return

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([...SILENT_FAILURE_CUE_PATTERN])
  }

  window.dispatchEvent(new Event(SILENT_FAILURE_CUE_EVENT))
}

export function onSilentFailureCue(listener: () => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => listener()
  window.addEventListener(SILENT_FAILURE_CUE_EVENT, handler)
  return () => window.removeEventListener(SILENT_FAILURE_CUE_EVENT, handler)
}

export const SILENT_FAILURE_RECOVERY_EVENT = 'quanto:silent-failure-recovery'

export function requestSilentFailureRecovery() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(SILENT_FAILURE_RECOVERY_EVENT))
}

export function onSilentFailureRecovery(listener: () => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = () => listener()
  window.addEventListener(SILENT_FAILURE_RECOVERY_EVENT, handler)
  return () => window.removeEventListener(SILENT_FAILURE_RECOVERY_EVENT, handler)
}
