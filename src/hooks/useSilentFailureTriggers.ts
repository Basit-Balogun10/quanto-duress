import { useEffect } from 'react'
import {
  getSpeechRecognition,
  motionMagnitude,
  normalizePhrase,
} from '@/lib/triggers'
import { useBankingStore } from '@/lib/store'

export function useSilentFailureTriggers() {
  const settings = useBankingStore((state) => state.silentFailure)
  const active = useBankingStore((state) => state.silentFailureActive)
  const trigger = useBankingStore((state) => state.triggerSilentFailure)
  const listening = Boolean(settings) && !active

  useEffect(() => {
    if (!listening || !settings?.shake) return

    let spikes: number[] = []
    const handleMotion = (event: DeviceMotionEvent) => {
      const magnitude = motionMagnitude(event)
      if (magnitude === null || magnitude < 15) return

      const now = Date.now()
      spikes = spikes.filter((timestamp) => now - timestamp < 1000)
      spikes.push(now)

      if (spikes.length >= 3) {
        spikes = []
        trigger('shake')
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [listening, settings?.shake, trigger])

  useEffect(() => {
    if (!listening || !settings?.voice) return

    const Recognition = getSpeechRecognition()
    const phrase = normalizePhrase(settings.phrase)
    if (!Recognition || !phrase) return

    let stopped = false
    let restartTimer: number | undefined
    let recognition: InstanceType<typeof Recognition> | null = null

    const start = () => {
      if (stopped) return

      const next = new Recognition()
      recognition = next
      next.continuous = true
      next.interimResults = true
      next.lang = 'en-NG'

      next.onresult = (event) => {
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = normalizePhrase(event.results[index][0]?.transcript ?? '')
          if (transcript.includes(phrase)) {
            stopped = true
            window.clearTimeout(restartTimer)
            next.abort()
            trigger('voice')
            return
          }
        }
      }

      next.onerror = (event) => {
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          stopped = true
        }
      }

      next.onend = () => {
        if (!stopped) {
          restartTimer = window.setTimeout(start, 650)
        }
      }

      try {
        next.start()
      } catch {
        stopped = true
      }
    }

    start()

    return () => {
      stopped = true
      window.clearTimeout(restartTimer)
      recognition?.abort()
    }
  }, [listening, settings?.voice, settings?.phrase, trigger])
}
