import { useState } from 'react'
import {
  Check,
  Copy,
  KeyRound,
  Landmark,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBankingStore } from '@/lib/store'

function PinForm() {
  const pin = useBankingStore((state) => state.pin)
  const setPin = useBankingStore((state) => state.setPin)
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(false)
    if (currentPin !== pin) {
      setError('Your current PIN is not correct.')
      return
    }
    if (!/^\d{4}$/.test(nextPin)) {
      setError('Your new PIN must be exactly 4 digits.')
      return
    }
    if (nextPin !== confirmPin) {
      setError('The new PIN and confirmation do not match.')
      return
    }
    if (nextPin === currentPin) {
      setError('Choose a new PIN that is different from your current PIN.')
      return
    }
    setPin(nextPin)
    setCurrentPin('')
    setNextPin('')
    setConfirmPin('')
    setError(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fathom-soft text-fathom">
          <KeyRound className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold">Transfer PIN</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Use a 4-digit PIN to authorize every transfer from your account.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Current PIN', value: currentPin, setter: setCurrentPin },
          { label: 'New PIN', value: nextPin, setter: setNextPin },
          { label: 'Confirm new PIN', value: confirmPin, setter: setConfirmPin },
        ].map((field) => (
          <label key={field.label} className="block">
            <span className="text-[0.68rem] font-medium text-muted">{field.label}</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={field.value}
              onChange={(event) => {
                field.setter(event.target.value.replace(/\D/g, '').slice(0, 4))
                setError(null)
              }}
              className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 font-mono text-lg tracking-[0.35em] outline-none transition-colors focus:border-fathom"
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.65rem] text-muted">Demo PIN: {pin}</p>
        <button type="button" onClick={save} className="btn-primary px-5 py-2.5 text-xs">
          {saved ? (
            <>
              <Check className="size-3.5" />
              PIN updated
            </>
          ) : (
            'Update PIN'
          )}
        </button>
      </div>
    </section>
  )
}

export function Settings() {
  const state = useBankingStore()
  const resetDemo = useBankingStore((state) => state.resetDemo)
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(state.owner.accountNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const reset = () => {
    resetDemo()
    setConfirmReset(false)
    navigate('/app')
  }

  return (
    <div className="animate-fade-up">
      <p className="label-mono text-[0.58rem] text-fathom">Preferences</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">Settings.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Manage your profile, account details, and the PIN used to authorize transfers.
      </p>

      <div className="mt-7 space-y-4">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-lumen-deep/45 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-dawn font-display text-xl font-semibold text-fathom-deep">
              {state.owner.initials}
            </span>
            <div>
              <p className="text-sm font-semibold">{state.owner.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {state.owner.bank} · Personal account
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-lumen px-3 py-1.5 text-[0.62rem] font-medium text-fathom">
            <ShieldCheck className="size-3.5" />
            Account verified
          </span>
        </section>

        <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lumen-dark text-fathom">
              <Landmark className="size-4.5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">Account details</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Share these details to receive money into your Quanto account.
              </p>
            </div>
          </div>

          <div className="mt-5 divide-y divide-line rounded-2xl border border-line px-4">
            <div className="flex items-center justify-between gap-4 py-3.5 text-xs">
              <span className="text-muted">Account name</span>
              <span className="font-medium">{state.owner.name}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5 text-xs">
              <span className="text-muted">Bank</span>
              <span className="font-medium">{state.owner.bank}</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5 text-xs">
              <span className="text-muted">Account number</span>
              <button
                type="button"
                onClick={copyAccount}
                className="flex items-center gap-2 font-mono font-medium text-fathom"
              >
                {state.owner.accountNumber}
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
        </section>

        <PinForm />

        <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pulse-soft text-pulse">
              <RotateCcw className="size-4.5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">Reset demo</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Restore the starting balance, recipients, transactions, and PIN. This clears
                browser-stored demo data.
              </p>
            </div>
          </div>

          {confirmReset ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                className="rounded-full bg-pulse px-5 py-3 text-xs font-semibold text-lumen hover:opacity-90"
              >
                Yes, reset everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="btn-secondary px-5 py-3 text-xs"
              >
                Keep my demo data
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="btn-secondary mt-4 px-5 py-3 text-xs"
            >
              Reset demo data
            </button>
          )}
        </section>

        <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-lumen-deep/35 p-4 text-[0.66rem] leading-relaxed text-muted">
          <UserRound className="mt-0.5 size-3.5 shrink-0 text-fathom" />
          This is a local demo. Profile details, PINs, and transactions are stored in your
          browser and are not connected to a real bank.
        </div>
      </div>
    </div>
  )
}
