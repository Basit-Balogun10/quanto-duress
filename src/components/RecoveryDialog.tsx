import { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { PinInput } from './PinInput'
import { useBankingStore } from '@/lib/store'

interface RecoveryDialogProps {
  onClose: () => void
  onRestored?: () => void
}

export function RecoveryDialog({ onClose, onRestored }: RecoveryDialogProps) {
  const clearSilentFailure = useBankingStore((state) => state.clearSilentFailure)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, onClose])

  const restore = async (pin: string) => {
    setBusy(true)
    setError(null)
    await new Promise((resolve) => setTimeout(resolve, 280))

    if (!clearSilentFailure(pin)) {
      setBusy(false)
      setError('That recovery PIN is not correct.')
      setResetKey((key) => key + 1)
      return
    }

    setRestored(true)
    window.setTimeout(() => {
      onRestored?.()
      onClose()
    }, 600)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-vast/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => {
        if (!busy) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Restore connection"
        onClick={(event) => event.stopPropagation()}
        className="w-full animate-fade-up rounded-t-[2rem] bg-lumen p-6 shadow-soft sm:max-w-sm sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-fathom-soft text-fathom">
            {restored ? <Wifi className="size-5" /> : <WifiOff className="size-5" />}
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close recovery"
            className="flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-vast disabled:opacity-40"
          >
            <X className="size-4" />
          </button>
        </div>

        {restored ? (
          <div className="mt-5">
            <p className="label-mono text-[0.56rem] text-fathom">Connection restored</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">You are back online.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Transfers are available again. Your balance and account activity are unchanged.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <p className="label-mono text-[0.56rem] text-muted">Recovery</p>
              <h2 className="mt-2 font-display text-3xl font-semibold">Restore connection.</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Enter your recovery PIN to reconnect this device and enable transfers.
              </p>
            </div>

            <div className="mt-6">
              <PinInput
                key={resetKey}
                disabled={busy}
                error={error}
                onSubmit={restore}
              />
            </div>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-[0.65rem] text-muted">
              <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
              {busy ? 'Reconnecting…' : 'Your money has not left this account.'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
