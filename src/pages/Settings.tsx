import { useEffect, useState } from 'react'
import {
  Banknote,
  Check,
  Copy,
  KeyRound,
  Landmark,
  LockKeyhole,
  Mic,
  Percent,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
  Vibrate,
  WifiOff,
} from 'lucide-react'
import { lockApp, switchAccount } from '@/lib/session'
import { playSilentFailureCue } from '@/lib/silentFailureCue'
import { useBankingStore } from '@/lib/store'
import {
  getRememberedMicrophoneAccess,
  getRememberedMotionAccess,
  motionSupported,
  queryMicrophoneAccess,
  requestMicrophoneAccess,
  requestMotionAccess,
  speechSupported,
} from '@/lib/triggers'
import type { TriggerAccess } from '@/lib/triggers'
import type { DuressBalanceMode, DuressHistoryMode } from '@/lib/types'
import { cn, formatNaira } from '@/lib/utils'

function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean
  onChange: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-fathom' : 'bg-lumen-dark',
      )}
    >
      <span
        className={cn(
          'size-5 rounded-full bg-lumen shadow-sm transition-transform',
          checked ? 'translate-x-5.5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function PinForm() {
  const pin = useBankingStore((state) => state.pin)
  const duressPin = useBankingStore((state) => state.duress?.pin)
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
    if (duressPin && nextPin === duressPin) {
      setError('Choose a PIN that is different from your duress PIN.')
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
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Transfer PIN</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Use a 4-digit PIN to unlock the app and authorize every transfer from your
            account.
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

      <div className="mt-4 flex justify-end">
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

function DuressForm() {
  const duress = useBankingStore((state) => state.duress)
  const pin = useBankingStore((state) => state.pin)
  const balance = useBankingStore((state) => state.balance)
  const setDuressSettings = useBankingStore((state) => state.setDuressSettings)
  const configured = duress !== null

  const [setupOpen, setSetupOpen] = useState(configured)
  const [duressPin, setDuressPin] = useState(duress?.pin ?? '')
  const [mode, setMode] = useState<DuressBalanceMode>(duress?.mode ?? 'percent')
  const [historyMode, setHistoryMode] = useState<DuressHistoryMode>(
    duress?.historyMode ?? 'decoy',
  )
  const [amount, setAmount] = useState(
    duress?.mode === 'amount' ? String(duress.value) : '',
  )
  const [percent, setPercent] = useState(
    duress?.mode === 'percent' ? String(duress.value) : '20',
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const amountValue = Number(amount) || 0
  const percentValue = Number(percent) || 0
  const preview =
    mode === 'amount'
      ? Math.min(amountValue, balance)
      : Math.round((balance * Math.min(percentValue, 100)) / 100)

  const toggle = () => {
    if (setupOpen) {
      setSetupOpen(false)
      if (configured) setDuressSettings(null)
      setDuressPin('')
      setMode('percent')
      setHistoryMode('decoy')
      setAmount('')
      setPercent('20')
      setError(null)
      setSaved(false)
      return
    }
    setSetupOpen(true)
  }

  const save = () => {
    setSaved(false)
    if (!/^\d{4}$/.test(duressPin)) {
      setError('Your duress PIN must be exactly 4 digits.')
      return
    }
    if (duressPin === pin) {
      setError('Your duress PIN must be different from your transfer PIN.')
      return
    }
    if (mode === 'amount' && amountValue > balance) {
      setError('The duress balance cannot be more than your available balance.')
      return
    }
    if (mode === 'percent' && percentValue > 100) {
      setError('The duress percentage cannot be more than 100%.')
      return
    }

    setDuressSettings({
      pin: duressPin,
      mode,
      value: Math.round(mode === 'amount' ? amountValue : percentValue),
      historyMode,
    })
    setError(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dawn text-fathom-deep">
          <ShieldAlert className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Duress access</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Opt in to a second PIN that shows a limited balance and caps how much can be
            sent. It is off until you set it up.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3.5">
        <div>
          <p className="text-xs font-semibold">
            {setupOpen
              ? configured
                ? 'Duress access enabled'
                : 'Finish setting up'
              : 'Duress access off'}
          </p>
          <p className="mt-0.5 text-[0.65rem] leading-relaxed text-muted">
            {setupOpen
              ? configured
                ? 'Your duress PIN is active on the lock screen.'
                : 'Save the details below to turn it on.'
              : 'Unlocking always shows your real balance until this is turned on.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={setupOpen}
          aria-label="Enable duress access"
          onClick={toggle}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            setupOpen ? 'bg-fathom' : 'bg-lumen-dark',
          )}
        >
          <span
            className={cn(
              'size-5 rounded-full bg-lumen shadow-sm transition-transform',
              setupOpen ? 'translate-x-5.5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      {setupOpen && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[0.68rem] font-medium text-muted">Duress PIN</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={duressPin}
                onChange={(event) => {
                  setDuressPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                  setError(null)
                }}
                className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 font-mono text-lg tracking-[0.35em] outline-none transition-colors focus:border-fathom"
              />
            </label>

            <div>
              <span className="text-[0.68rem] font-medium text-muted">Show balance as</span>
              <div className="mt-2 flex rounded-2xl border border-line bg-lumen-deep/40 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('amount')
                    setError(null)
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[0.68rem] font-medium transition-colors',
                    mode === 'amount'
                      ? 'bg-fathom text-lumen'
                      : 'text-muted hover:text-vast',
                  )}
                >
                  <Banknote className="size-3.5" />
                  Amount
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('percent')
                    setError(null)
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[0.68rem] font-medium transition-colors',
                    mode === 'percent'
                      ? 'bg-fathom text-lumen'
                      : 'text-muted hover:text-vast',
                  )}
                >
                  <Percent className="size-3.5" />
                  Percentage
                </button>
              </div>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-[0.68rem] font-medium text-muted">
              {mode === 'amount' ? 'Amount to show' : 'Percentage to show'}
            </span>
            <div className="relative mt-2">
              {mode === 'amount' && (
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg text-muted">
                  ₦
                </span>
              )}
              <input
                value={mode === 'amount' ? amount : percent}
                onChange={(event) => {
                  const next = event.target.value
                    .replace(/\D/g, '')
                    .slice(0, mode === 'amount' ? 9 : 3)
                  if (mode === 'amount') {
                    setAmount(next)
                  } else {
                    setPercent(next)
                  }
                  setError(null)
                }}
                inputMode="numeric"
                autoComplete="off"
                className={cn(
                  'w-full rounded-2xl border border-line bg-lumen px-4 py-3.5 font-mono text-sm outline-none transition-colors focus:border-fathom',
                  mode === 'amount' ? 'pl-9' : 'pr-10',
                )}
              />
              {mode === 'percent' && (
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-sm text-muted">
                  %
                </span>
              )}
            </div>
          </label>

          <div className="mt-4">
            <span className="text-[0.68rem] font-medium text-muted">
              History in duress mode
            </span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setHistoryMode('decoy')
                  setError(null)
                }}
                className={cn(
                  'rounded-2xl border p-3.5 text-left transition-colors',
                  historyMode === 'decoy'
                    ? 'border-fathom bg-fathom-soft/55'
                    : 'border-line bg-lumen-deep/40 hover:border-fathom/40',
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {historyMode === 'decoy' && <Check className="size-3.5 text-fathom" />}
                  Match dummy balance
                </span>
                <span className="mt-1 block text-[0.64rem] leading-relaxed text-muted">
                  Build a separate, realistic spending history that adds up to the balance
                  shown.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistoryMode('real')
                  setError(null)
                }}
                className={cn(
                  'rounded-2xl border p-3.5 text-left transition-colors',
                  historyMode === 'real'
                    ? 'border-fathom bg-fathom-soft/55'
                    : 'border-line bg-lumen-deep/40 hover:border-fathom/40',
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {historyMode === 'real' && <Check className="size-3.5 text-fathom" />}
                  Keep real history
                </span>
                <span className="mt-1 block text-[0.64rem] leading-relaxed text-muted">
                  Keep the actual transactions visible even though the balance is reduced.
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-lumen-deep/40 p-4">
            <p className="label-mono text-[0.52rem] text-muted">
              Balance shown in duress mode
            </p>
            <p className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
              {formatNaira(preview)}
            </p>
            <p className="mt-1 text-[0.66rem] leading-relaxed text-muted">
              {mode === 'percent'
                ? `${Math.min(percentValue, 100)}% of your current ${formatNaira(balance)} balance.`
                : 'A fixed amount, capped at your current available balance.'}{' '}
              It becomes the maximum you can send while duress mode is active.
            </p>
          </div>

          {error && (
            <p className="mt-3 text-xs font-medium text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.65rem] text-muted">
              {duress
                ? 'Duress PIN saved on this device.'
                : 'Not saved yet'}
            </p>
            <button
              type="button"
              onClick={save}
              className="btn-primary px-5 py-2.5 text-xs"
            >
              {saved ? (
                <>
                  <Check className="size-3.5" />
                  Duress access updated
                </>
              ) : (
                'Save duress access'
              )}
            </button>
          </div>

          <p className="mt-4 border-t border-line pt-3 text-[0.64rem] leading-relaxed text-muted">
            The limited balance is locked in when you unlock with the duress PIN and stays
            in place across reloads. Unlock with your normal PIN to clear it and restore
            your real balance.
          </p>
        </>
      )}
    </section>
  )
}

const accessStyles: Record<TriggerAccess, { label: string; className: string }> = {
  granted: { label: 'Granted', className: 'bg-success-soft text-success' },
  denied: { label: 'Denied', className: 'bg-danger-soft text-danger' },
  unsupported: { label: 'Unsupported', className: 'bg-lumen-dark text-muted' },
  unknown: { label: 'Not requested', className: 'bg-warning-soft text-warning' },
}

function AccessStatus({ label, status }: { label: string; status: TriggerAccess }) {
  const style = accessStyles[status]

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-lumen px-3 py-2.5">
      <span className="text-[0.66rem] font-medium text-muted">{label}</span>
      <span
        className={cn(
          'rounded-full px-2 py-1 text-[0.56rem] font-semibold',
          style.className,
        )}
      >
        {style.label}
      </span>
    </div>
  )
}

function SilentFailureForm() {
  const silentFailure = useBankingStore((state) => state.silentFailure)
  const silentFailureActive = useBankingStore((state) => state.silentFailureActive)
  const duress = useBankingStore((state) => state.duress)
  const pin = useBankingStore((state) => state.pin)
  const setSilentFailureSettings = useBankingStore(
    (state) => state.setSilentFailureSettings,
  )
  const configured = silentFailure !== null && !silentFailureActive
  const motionAvailable = motionSupported()
  const voiceAvailable = speechSupported()

  const [setupOpen, setSetupOpen] = useState(configured)
  const [shake, setShake] = useState(
    () => !silentFailureActive && (silentFailure?.shake ?? true) && motionAvailable,
  )
  const [voice, setVoice] = useState(
    () => !silentFailureActive && (silentFailure?.voice ?? false) && voiceAvailable,
  )
  const [motionAccess, setMotionAccess] = useState<TriggerAccess>(() =>
    motionAvailable ? getRememberedMotionAccess() : 'unsupported',
  )
  const [micAccess, setMicAccess] = useState<TriggerAccess>(() =>
    voiceAvailable ? getRememberedMicrophoneAccess() : 'unsupported',
  )
  const [phrase, setPhrase] = useState(
    () => (silentFailureActive ? 'quanto hold' : silentFailure?.phrase ?? 'quanto hold'),
  )
  const [recoverySame, setRecoverySame] = useState(
    () =>
      !silentFailureActive &&
      (silentFailure ? silentFailure.recoveryUsesDuressPin : Boolean(duress)),
  )
  const [recoveryPin, setRecoveryPin] = useState(
    () => (silentFailureActive ? '' : silentFailure?.recoveryPin ?? ''),
  )
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [cueSent, setCueSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const recoveryUsesDuress = recoverySame && Boolean(duress)

  useEffect(() => {
    if (!voiceAvailable) return

    let cancelled = false
    void queryMicrophoneAccess().then((access) => {
      if (!cancelled && access !== 'unknown') setMicAccess(access)
    })

    return () => {
      cancelled = true
    }
  }, [voiceAvailable])

  const reset = () => {
    setShake(motionAvailable)
    setVoice(false)
    setPhrase('quanto hold')
    setRecoverySame(Boolean(duress))
    setRecoveryPin('')
    setMotionAccess(motionAvailable ? getRememberedMotionAccess() : 'unsupported')
    setMicAccess(
      voiceAvailable ? getRememberedMicrophoneAccess() : 'unsupported',
    )
    setError(null)
    setSaved(false)
  }

  const toggle = () => {
    if (setupOpen) {
      setSetupOpen(false)
      if (configured) setSilentFailureSettings(null)
      reset()
      return
    }
    if (!configured) setRecoverySame(Boolean(duress))
    setSetupOpen(true)
  }

  const save = async () => {
    setSaved(false)
    setError(null)

    if (silentFailureActive) {
      setError('Security settings are temporarily unavailable. Try again later.')
      return
    }

    const usableShake = shake && motionAvailable
    const usableVoice = voice && voiceAvailable

    if (!usableShake && !usableVoice && !duress) {
      setError('Enable at least one trigger that this device supports.')
      return
    }
    if (voice && phrase.trim().length < 2) {
      setError('Enter a wake phrase with at least 2 characters.')
      return
    }

    const recovery = recoveryUsesDuress ? duress?.pin : recoveryPin
    if (!recovery || !/^\d{4}$/.test(recovery)) {
      setError(
        recoveryUsesDuress
          ? 'Set up duress access before using its PIN for recovery.'
          : 'Your recovery PIN must be exactly 4 digits.',
      )
      return
    }
    if (!recoveryUsesDuress && recovery === pin) {
      setError('Choose a recovery PIN that is different from your transfer PIN.')
      return
    }

    if (usableShake || usableVoice) setSaving(true)

    if (usableShake) {
      const access = await requestMotionAccess()
      setMotionAccess(access)
      if (access !== 'granted') {
        setSaving(false)
        setError(
          access === 'denied'
            ? 'Motion access was denied. Allow it in your browser settings.'
            : 'Motion access is unavailable on this device.',
        )
        return
      }
    }

    if (usableVoice) {
      const access = await requestMicrophoneAccess()
      setMicAccess(access)
      if (access !== 'granted') {
        setSaving(false)
        setError(
          access === 'denied'
            ? 'Microphone access was denied. Allow it in your browser settings.'
            : 'Microphone access is unavailable on this device.',
        )
        return
      }
    }

    setSaving(false)

    setSilentFailureSettings({
      shake: usableShake,
      voice: usableVoice,
      phrase: phrase.trim(),
      recoveryPin: recovery,
      recoveryUsesDuressPin: recoveryUsesDuress,
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const previewCue = () => {
    playSilentFailureCue()
    setCueSent(true)
    window.setTimeout(() => setCueSent(false), 1600)
  }

  return (
    <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pulse-soft text-pulse">
          <WifiOff className="size-4.5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Silent failure</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Opt in to a hidden safety mode. Once triggered, transfers stop with a realistic
            network error until your recovery PIN is entered. It is off until you set it up.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3.5">
        <div>
          <p className="text-xs font-semibold">
            {setupOpen
              ? configured
                ? 'Silent failure enabled'
                : 'Finish setting up'
              : 'Silent failure off'}
          </p>
          <p className="mt-0.5 text-[0.65rem] leading-relaxed text-muted">
            {setupOpen
              ? configured
                ? 'Triggers are armed only while this tab is in the foreground.'
                : 'Choose triggers and a recovery PIN below.'
              : 'Transfers always behave normally until this is turned on.'}
          </p>
        </div>
        <Switch
          checked={setupOpen}
          onChange={toggle}
          label="Enable silent failure"
        />
      </div>

      {setupOpen && (
        <>
          <div className="mt-5 overflow-hidden rounded-2xl border border-line">
            <div className="flex items-center justify-between gap-4 border-b border-line bg-lumen-deep/30 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-lumen-dark text-fathom">
                  <Smartphone className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Shake to fail</p>
                  <p className="mt-0.5 text-[0.64rem] leading-relaxed text-muted">
                    {motionAvailable
                      ? 'Three sharp shakes within a second trigger the failure. Motion access is requested on save.'
                      : 'Motion sensors are unavailable on this device.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={shake}
                onChange={() => {
                  setShake((value) => !value)
                  setError(null)
                }}
                disabled={!motionAvailable}
                label="Toggle shake trigger"
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-line bg-lumen-deep/30 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-lumen-dark text-fathom">
                  <Mic className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Wake phrase</p>
                  <p className="mt-0.5 text-[0.64rem] leading-relaxed text-muted">
                    {voiceAvailable
                      ? 'Listens only in the foreground. Microphone access is requested on save.'
                      : 'Voice recognition is unavailable in this browser.'}
                  </p>
                </div>
              </div>
              <Switch
                checked={voice}
                onChange={() => {
                  setVoice((value) => !value)
                  setError(null)
                }}
                disabled={!voiceAvailable}
                label="Toggle wake phrase trigger"
              />
            </div>

            <div className="flex items-center justify-between gap-4 bg-lumen-deep/30 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-lumen-dark text-fathom">
                  <KeyRound className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Duress PIN on transfer</p>
                  <p className="mt-0.5 text-[0.64rem] leading-relaxed text-muted">
                    {duress
                      ? 'Entering your duress PIN on a transfer fails it instead of sending.'
                      : 'Set up duress access above to enable this trigger.'}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'rounded-full px-3 py-1.5 text-[0.6rem] font-medium',
                  duress
                    ? 'bg-success-soft text-success'
                    : 'bg-lumen-dark text-muted',
                )}
              >
                {duress ? 'On' : 'Unavailable'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-line bg-lumen-deep/30 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-lumen-dark text-fathom">
                  <Landmark className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold">Hold the logo</p>
                  <p className="mt-0.5 text-[0.64rem] leading-relaxed text-muted">
                    Press and hold the Quanto logo for 2.5 seconds anywhere, including the
                    lock screen.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-success-soft px-3 py-1.5 text-[0.6rem] font-medium text-success">
                On
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-line bg-lumen-deep/40 p-4">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lumen-dark text-fathom">
                <Vibrate className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">Caught cue</p>
                <p className="mt-1 text-[0.64rem] leading-relaxed text-muted">
                  A caught trigger gives a short double pulse where supported, plus a
                  brief dot near the top-right. It is intentionally easy to miss.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={previewCue}
              className="shrink-0 rounded-full border border-line bg-lumen px-3 py-1.5 text-[0.6rem] font-semibold text-fathom"
            >
              {cueSent ? 'Cue sent' : 'Test cue'}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-lumen-deep/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label-mono text-[0.52rem] text-muted">Device access</p>
              <span className="rounded-full bg-fathom-soft px-2.5 py-1 text-[0.56rem] font-semibold text-fathom">
                Foreground only
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <AccessStatus label="Motion" status={motionAccess} />
              <AccessStatus label="Microphone" status={micAccess} />
            </div>
            <p className="mt-2 text-[0.62rem] leading-relaxed text-muted">
              Permissions are requested when you save. Shake and wake-phrase listening pause
              whenever this tab is in the background.
            </p>
          </div>

          {voice && (
            <label className="mt-4 block">
              <span className="text-[0.68rem] font-medium text-muted">Wake phrase</span>
              <input
                value={phrase}
                onChange={(event) => {
                  setPhrase(event.target.value.slice(0, 30))
                  setError(null)
                }}
                autoComplete="off"
                className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3.5 text-sm outline-none transition-colors focus:border-fathom"
              />
              <span className="mt-1.5 block text-[0.62rem] text-muted">
                Say this phrase anywhere in the app to trigger the failure.
              </span>
            </label>
          )}

          <div className="mt-4 rounded-2xl border border-line bg-lumen-deep/40 p-4">
            <p className="label-mono text-[0.52rem] text-muted">Recovery PIN</p>
            <p className="mt-1.5 text-[0.66rem] leading-relaxed text-muted">
              Clears the blocked state and restores transfers. It stays active across
              reloads until this PIN is entered.
            </p>

            {duress && (
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3.5">
                <div>
                  <p className="text-xs font-semibold">Use my duress PIN</p>
                  <p className="mt-0.5 text-[0.64rem] text-muted">
                    Default. Turn off to choose a separate recovery PIN.
                  </p>
                </div>
                <Switch
                  checked={recoveryUsesDuress}
                  onChange={() => {
                    setRecoverySame((value) => !value)
                    setError(null)
                  }}
                  label="Use duress PIN for recovery"
                />
              </div>
            )}

            {!recoveryUsesDuress && (
              <label className="mt-4 block">
                <span className="text-[0.68rem] font-medium text-muted">
                  Separate recovery PIN
                </span>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={recoveryPin}
                  onChange={(event) => {
                    setRecoveryPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                    setError(null)
                  }}
                  className="mt-2 w-full rounded-2xl border border-line bg-lumen px-4 py-3 font-mono text-lg tracking-[0.35em] outline-none transition-colors focus:border-fathom"
                />
              </label>
            )}
          </div>

          {error && (
            <p className="mt-3 text-xs font-medium text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.65rem] text-muted">
              {configured
                ? 'Recovery PIN saved on this device.'
                : 'Not saved yet'}
            </p>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-primary px-5 py-2.5 text-xs disabled:opacity-50"
            >
              {saved ? (
                <>
                  <Check className="size-3.5" />
                  Silent failure updated
                </>
              ) : saving ? (
                'Checking device access…'
              ) : (
                'Save silent failure'
              )}
            </button>
          </div>

          <p className="mt-4 border-t border-line pt-3 text-[0.64rem] leading-relaxed text-muted">
            Once triggered, the app keeps transfers blocked across reloads. It never sends
            the transfer. Use the recovery PIN to clear it.
          </p>
        </>
      )}
    </section>
  )
}

export function Settings() {
  const state = useBankingStore()
  const [copied, setCopied] = useState(false)

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(state.owner.accountNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <p className="label-mono text-[0.58rem] text-fathom">Preferences</p>
      <h1 className="display mt-2 text-3xl sm:text-5xl">Settings</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        {state.duressActive
          ? 'Manage your profile and account details.'
          : 'Manage your profile, account details, security, and connection safety.'}
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
                Personal account
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
              <h2 className="font-display text-xl font-semibold sm:text-2xl">Account details</h2>
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

        {!state.duressActive && (
          <>
            <PinForm />
            <DuressForm />
            <SilentFailureForm key={state.silentFailureActive ? 'active' : 'idle'} />

            <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lumen-dark text-fathom">
                  <LockKeyhole className="size-4.5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold sm:text-2xl">
                    Session
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Lock this app or move to another account stored in this browser.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={lockApp}
                  className="btn-primary px-5 py-3 text-xs"
                >
                  <LockKeyhole className="size-3.5" />
                  Lock app
                </button>
                <button
                  type="button"
                  onClick={switchAccount}
                  className="btn-secondary px-5 py-3 text-xs"
                >
                  <Users className="size-3.5" />
                  Switch account
                </button>
              </div>
            </section>
          </>
        )}

        <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-lumen-deep/35 p-4 text-[0.66rem] leading-relaxed text-muted">
          <UserRound className="mt-0.5 size-3.5 shrink-0 text-fathom" />
          Profile details, PINs, and transactions are stored on this device.
        </div>
      </div>
    </div>
  )
}
