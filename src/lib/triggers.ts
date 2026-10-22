export type MotionAccess = 'granted' | 'denied' | 'unsupported'
export type TriggerAccess = MotionAccess | 'unknown'

const MOTION_ACCESS_KEY = 'quanto-motion-access'
const MICROPHONE_ACCESS_KEY = 'quanto-microphone-access'

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

export function getRememberedMotionAccess(): TriggerAccess {
  if (!motionSupported()) return 'unsupported'

  try {
    const value = sessionStorage.getItem(MOTION_ACCESS_KEY)
    return value === 'granted' || value === 'denied' ? value : 'unknown'
  } catch {
    return 'unknown'
  }
}

function rememberMotionAccess(access: MotionAccess) {
  try {
    sessionStorage.setItem(MOTION_ACCESS_KEY, access)
  } catch {
    // Session storage can be unavailable in private or sandboxed contexts.
  }
}

export async function requestMotionAccess(): Promise<MotionAccess> {
  if (!motionSupported()) return 'unsupported'

  const constructor = window.DeviceMotionEvent as unknown as MotionEventConstructor
  if (typeof constructor.requestPermission !== 'function') {
    rememberMotionAccess('granted')
    return 'granted'
  }

  try {
    const access = await constructor.requestPermission()
    rememberMotionAccess(access)
    return access
  } catch {
    rememberMotionAccess('denied')
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

export function microphoneSupported() {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

export function getRememberedMicrophoneAccess(): TriggerAccess {
  if (!speechSupported() || !microphoneSupported()) return 'unsupported'

  try {
    const value = sessionStorage.getItem(MICROPHONE_ACCESS_KEY)
    return value === 'granted' || value === 'denied' ? value : 'unknown'
  } catch {
    return 'unknown'
  }
}

function rememberMicrophoneAccess(access: MotionAccess) {
  try {
    sessionStorage.setItem(MICROPHONE_ACCESS_KEY, access)
  } catch {
    // Session storage can be unavailable in private or sandboxed contexts.
  }
}

export async function queryMicrophoneAccess(): Promise<TriggerAccess> {
  if (!speechSupported() || !microphoneSupported()) return 'unsupported'
  if (!navigator.permissions?.query) return 'unknown'

  try {
    const status = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    })
    if (status.state === 'granted') return 'granted'
    if (status.state === 'denied') return 'denied'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function requestMicrophoneAccess(): Promise<MotionAccess> {
  if (!speechSupported() || !microphoneSupported()) return 'unsupported'

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    rememberMicrophoneAccess('granted')
    return 'granted'
  } catch {
    rememberMicrophoneAccess('denied')
    return 'denied'
  }
}

export function normalizePhrase(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
