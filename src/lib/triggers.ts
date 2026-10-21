export type MotionAccess = 'granted' | 'denied' | 'unsupported'

interface MotionEventConstructor {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

interface SpeechResult {
  length: number
  0: { transcript: string }
}

interface SpeechResultList {
  length: number
  [index: number]: SpeechResult
}

export interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechResultList
}

export interface SpeechRecognitionErrorLike {
  error: string
}

export interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike
}

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export function motionSupported() {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window
}

export async function requestMotionAccess(): Promise<MotionAccess> {
  if (!motionSupported()) return 'unsupported'

  const constructor = window.DeviceMotionEvent as unknown as MotionEventConstructor
  if (typeof constructor.requestPermission !== 'function') return 'granted'

  try {
    return await constructor.requestPermission()
  } catch {
    return 'denied'
  }
}

export function motionMagnitude(event: DeviceMotionEvent) {
  const acceleration = event.accelerationIncludingGravity
  if (!acceleration) return null
  const x = acceleration.x ?? 0
  const y = acceleration.y ?? 0
  const z = acceleration.z ?? 0
  return Math.sqrt(x * x + y * y + z * z)
}

export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  const speechWindow = window as SpeechWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null
}

export function speechSupported() {
  return getSpeechRecognition() !== null
}

export function normalizePhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
