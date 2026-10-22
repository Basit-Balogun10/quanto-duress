export const SILENT_FAILURE_CUE_EVENT = 'quanto:silent-failure-cue'
export const SILENT_FAILURE_CUE_PATTERN = [18, 55, 18] as const

interface CueOptions {
  muted?: boolean
}

let audioContext: AudioContext | null = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (audioContext && audioContext.state !== 'closed') return audioContext

  const AudioContextConstructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioContextConstructor) return null

  try {
    audioContext = new AudioContextConstructor()
    return audioContext
  } catch {
    return null
  }
}

function scheduleTone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.03, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function playChime() {
  const context = getAudioContext()
  if (!context) return

  const play = () => {
    const start = context.currentTime + 0.01
    scheduleTone(context, 523.25, start, 0.16)
    scheduleTone(context, 659.25, start + 0.11, 0.2)
  }

  if (context.state === 'suspended') {
    void context.resume().then(play).catch(() => {})
    return
  }

  if (context.state === 'running') play()
}

export function primeSilentFailureCueSound() {
  const context = getAudioContext()
  if (context?.state === 'suspended') {
    void context.resume().catch(() => {})
  }
}

export function playSilentFailureCue({ muted = false }: CueOptions = {}) {
  if (typeof window === 'undefined') return

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([...SILENT_FAILURE_CUE_PATTERN])
  }

  if (!muted) playChime()

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
