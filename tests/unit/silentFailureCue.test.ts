import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  onSilentFailureCue,
  playSilentFailureCue,
  SILENT_FAILURE_CUE_PATTERN,
} from '../../src/lib/silentFailureCue'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('silent failure cue', () => {
  it('vibrates and emits a cue event', () => {
    const target = new EventTarget()
    const vibrate = vi.fn()
    vi.stubGlobal('window', target)
    vi.stubGlobal('navigator', { vibrate })

    const listener = vi.fn()
    const unsubscribe = onSilentFailureCue(listener)

    playSilentFailureCue()

    expect(vibrate).toHaveBeenCalledWith([...SILENT_FAILURE_CUE_PATTERN])
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    playSilentFailureCue()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('still emits the visual cue when vibration is unavailable', () => {
    const target = new EventTarget()
    vi.stubGlobal('window', target)
    vi.stubGlobal('navigator', {})

    const listener = vi.fn()
    onSilentFailureCue(listener)

    expect(() => playSilentFailureCue()).not.toThrow()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
