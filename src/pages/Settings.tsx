import { useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuantoStore } from '@/lib/store'

function PinEditor() {
  const normalPin = useQuantoStore((state) => state.normalPin)
  const duressPin = useQuantoStore((state) => state.duressPin)
  const setPins = useQuantoStore((state) => state.setPins)

  const [normal, setNormal] = useState(normalPin)
  const [duress, setDuress] = useState(duressPin)
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(false)
    if (!/^\d{4}$/.test(normal) || !/^\d{4}$/.test(duress)) {
      setError('Both PINs must be exactly 4 digits.')
      return
    }
    if (normal === duress) {
      setError('Your duress PIN must be different from your normal PIN.')
      return
    }
    setPins(normal, duress)
    setError(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fathom-soft text-fathom">
            <KeyRound className="size-4.5" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-semibold">Payment PINs</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              The duress PIN is accepted silently and never reveals itself in the payment
              flow.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="flex size-8 items-center justify-center rounded-full border border-line text-muted hover:text-vast"
          aria-label={visible ? 'Hide PINs' : 'Show PINs'}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.68rem] font-medium text-muted">Normal PIN</span>
          <input
            type={visible ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={normal}
            onChange={(event) => {
              setNormal(event.target.value.replace(/\D/g, '').slice(0, 4))
              setError(null)
            }}
            className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 font-mono text-lg tracking-[0.35em] outline-none transition-colors focus:border-fathom"
          />
        </label>
        <label className="block">
          <span className="text-[0.68rem] font-medium text-muted">Duress PIN</span>
          <input
            type={visible ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={duress}
            onChange={(event) => {
              setDuress(event.target.value.replace(/\D/g, '').slice(0, 4))
              setError(null)
            }}
            className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 font-mono text-lg tracking-[0.35em] outline-none transition-colors focus:border-fathom"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.65rem] text-muted">
          Demo defaults: normal 1234 · duress 9111
        </p>
        <button type="button" onClick={save} className="btn-primary px-5 py-2.5 text-xs">
          {saved ? (
            <>
              <Check className="size-3.5" />
              Saved
            </>
          ) : (
            'Save PINs'
          )}
        </button>
      </div>
    </section>
  )
}

function GuardianEditor() {
  const guardian = useQuantoStore((state) => state.guardian)
  const setGuardian = useQuantoStore((state) => state.setGuardian)
  const [name, setName] = useState(guardian.name)
  const [phone, setPhone] = useState(guardian.phone)
  const [enabled, setEnabled] = useState(guardian.enabled)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setGuardian({ name: name.trim() || guardian.name, phone, enabled })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dawn text-fathom-deep">
          <MessageSquareText className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold">Trusted contact</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            A duress payment can send this person a silent alert with the amount and
            reference.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.68rem] font-medium text-muted">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 40))}
            className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 text-sm outline-none transition-colors focus:border-fathom"
          />
        </label>
        <label className="block">
          <span className="text-[0.68rem] font-medium text-muted">Phone</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value.slice(0, 24))}
            className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 font-mono text-sm outline-none transition-colors focus:border-fathom"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-lumen-deep/35 px-4 py-3.5">
        <div>
          <p className="text-xs font-semibold">Guardian alerts</p>
          <p className="mt-0.5 text-[0.65rem] text-muted">
            {enabled ? 'Alerts are enabled for duress holds.' : 'Alerts are currently paused.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle guardian alerts"
          onClick={() => setEnabled((value) => !value)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            enabled ? 'bg-fathom' : 'bg-lumen-dark'
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-lumen shadow-sm transition-transform ${
              enabled ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={save} className="btn-primary px-5 py-2.5 text-xs">
          {saved ? (
            <>
              <Check className="size-3.5" />
              Saved
            </>
          ) : (
            'Save guardian'
          )}
        </button>
      </div>
    </section>
  )
}

export function Settings() {
  const { owner, resetDemo } = useQuantoStore()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)

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
        Manage the credentials and people that power your silent protection.
      </p>

      <div className="mt-7 space-y-4">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-lumen-deep/45 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-dawn font-display text-xl font-semibold text-fathom-deep">
              A
            </span>
            <div>
              <p className="text-sm font-semibold">{owner.name}</p>
              <p className="mt-0.5 text-xs text-muted">
                {owner.accountMask} · Personal account
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-line bg-lumen px-3 py-1.5 text-[0.62rem] font-medium text-fathom">
            <ShieldCheck className="size-3.5" />
            Verified demo profile
          </span>
        </section>

        <PinEditor />
        <GuardianEditor />

        <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pulse-soft text-pulse">
              <RotateCcw className="size-4.5" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">Reset demo</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Restore the seed balance, recipients, transactions, PINs, and guardian.
                This clears all holds and browser-stored demo data.
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
          This is a local hackathon demo. PINs, holds, alerts, and transactions are stored
          in your browser and are not connected to a real bank or messaging provider.
        </div>
      </div>
    </div>
  )
}
