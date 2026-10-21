import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface PinMeta {
  elapsedMs: number
  corrections: number
}

interface PinInputProps {
  disabled?: boolean
  error?: string | null
  onSubmit: (pin: string, meta: PinMeta) => void
}

export function PinInput({ disabled = false, error, onSubmit }: PinInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', ''])
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const startedAt = useRef(0)
  const corrections = useRef(0)
  const submitted = useRef(false)

  useEffect(() => {
    startedAt.current = Date.now()
    if (!disabled) {
      requestAnimationFrame(() => inputs.current[0]?.focus())
    }
  }, [disabled])

  const attemptSubmit = (nextDigits: string[]) => {
    if (submitted.current || nextDigits.some((digit) => !digit)) return
    submitted.current = true
    const pin = nextDigits.join('')
    window.setTimeout(() => {
      onSubmit(pin, {
        elapsedMs: Date.now() - startedAt.current,
        corrections: corrections.current,
      })
    }, 180)
  }

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)

    if (digit && index < 3) {
      inputs.current[index + 1]?.focus()
    }
    attemptSubmit(next)
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      corrections.current += 1
      const next = [...digits]
      if (next[index]) {
        next[index] = ''
      } else if (index > 0) {
        next[index - 1] = ''
        inputs.current[index - 1]?.focus()
      }
      setDigits(next)
      submitted.current = false
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < 3) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return
    const next = ['', '', '', '']
    pasted.split('').forEach((digit, index) => {
      next[index] = digit
    })
    setDigits(next)
    inputs.current[Math.min(pasted.length, 3)]?.focus()
    attemptSubmit(next)
  }

  return (
    <div>
      <div className="flex justify-center gap-3" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element
            }}
            aria-label={`PIN digit ${index + 1}`}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(event) => setDigit(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            className={cn(
              'h-16 w-14 rounded-2xl border-2 bg-lumen text-center font-mono text-2xl font-semibold text-vast transition-all',
              error
                ? 'border-flare bg-pulse-soft/50'
                : digit
                  ? 'border-fathom'
                  : 'border-lumen-dark focus:border-fathom',
              disabled && 'opacity-50',
            )}
          />
        ))}
      </div>
      {error && (
        <p className="mt-3 text-center text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
