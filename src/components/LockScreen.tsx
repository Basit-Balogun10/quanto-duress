import { useState } from 'react'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { PinInput } from './PinInput'
import { Logo } from './Logo'
import { useBankingStore } from '@/lib/store'

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const pin = useBankingStore((state) => state.pin)
  const duressActive = useBankingStore((state) => state.duressActive)
  const unlockWithPin = useBankingStore((state) => state.unlockWithPin)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)

  const handleUnlock = async (value: string) => {
    setBusy(true)
    setError(null)
    await new Promise((resolve) => setTimeout(resolve, 320))
    const result = unlockWithPin(value)

    if (!result) {
      setBusy(false)
      setError('That PIN is not correct. Try again.')
      setResetKey((key) => key + 1)
      return
    }

    onUnlock()
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-lumen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-lumen-deep" />
      <div className="pointer-events-none absolute -right-28 top-12 size-80 rounded-full border border-fathom/10" />
      <div className="pointer-events-none absolute -right-10 top-32 size-52 rounded-full border border-fathom/10" />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-7 sm:px-6">
        <Logo />
        <span className="flex items-center gap-2 rounded-full border border-line bg-lumen px-3 py-1.5 text-[0.65rem] font-medium text-fathom">
          <ShieldCheck className="size-3.5" />
          Secure access
        </span>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="animate-fade-up rounded-[2rem] border border-line bg-lumen p-6 shadow-card sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-full bg-fathom-soft text-fathom">
              <LockKeyhole className="size-5" />
            </span>
            <p className="label-mono mt-6 text-[0.58rem] text-muted">Welcome back</p>
            <h1 className="display mt-2 text-4xl sm:text-5xl">Unlock your account.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Enter your 4-digit PIN to continue to your Quanto account.
            </p>

            <div className="mt-7">
              <PinInput
                key={resetKey}
                disabled={busy}
                error={error}
                onSubmit={handleUnlock}
              />
            </div>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-[0.65rem] text-muted">
              <LockKeyhole className="size-3.5" />
              {busy ? 'Unlocking…' : 'Your session is locked when this page reloads.'}
            </div>

            {!duressActive && (
              <p className="mt-5 border-t border-line pt-3 text-center font-mono text-[0.56rem] uppercase tracking-wider text-muted/60">
                Demo PIN: {pin}
              </p>
            )}
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[0.62rem] leading-relaxed text-muted">
            <ShieldCheck className="size-3.5 shrink-0 text-fathom" />
            Local demo. No real bank connection.
          </p>
        </div>
      </main>
    </div>
  )
}
