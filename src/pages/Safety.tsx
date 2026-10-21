import { useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  ShieldQuestion,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PaymentError, resolveHeldPayment } from '@/lib/api'
import { useQuantoStore } from '@/lib/store'
import type { Incident, RiskSignal } from '@/lib/types'
import { cn, formatNaira, formatRelative } from '@/lib/utils'
import { PinInput } from '@/components/PinInput'

function toneClass(tone: RiskSignal['tone']) {
  if (tone === 'danger') return 'bg-pulse-soft text-pulse'
  if (tone === 'warning') return 'bg-warning-soft text-warning'
  return 'bg-lumen-deep text-muted'
}

function statusLabel(status: Incident['status']) {
  if (status === 'open') return 'Held for review'
  if (status === 'released') return 'Released'
  return 'Cancelled'
}

function IncidentCard({ incident }: { incident: Incident }) {
  const open = incident.status === 'open'
  const transaction = useQuantoStore((state) =>
    state.transactions.find((item) => item.id === incident.transactionId),
  )
  const [releaseMode, setReleaseMode] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const handleRelease = async (pin: string) => {
    setBusy(true)
    setPinError(null)
    setError(null)
    try {
      await resolveHeldPayment(incident.id, 'release', pin)
      setDone('Payment released. The transfer will now complete.')
      setReleaseMode(false)
    } catch (caught) {
      setPinError(
        caught instanceof PaymentError ? caught.message : 'Could not release payment.',
      )
      setResetKey((key) => key + 1)
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    setBusy(true)
    setError(null)
    try {
      await resolveHeldPayment(incident.id, 'cancel')
      setDone('Payment cancelled. Your available balance has been restored.')
      setConfirmCancel(false)
    } catch (caught) {
      setError(caught instanceof PaymentError ? caught.message : 'Could not cancel hold.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-3xl border bg-lumen',
        open ? 'border-pulse/25' : 'border-line',
      )}
    >
      <div className={cn('px-5 py-4 sm:px-6', open ? 'bg-pulse-soft/65' : 'bg-lumen-deep/50')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full',
                open ? 'bg-pulse text-lumen' : 'bg-fathom-soft text-fathom',
              )}
            >
              {open ? (
                <AlertTriangle className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
            </span>
            <div>
              <p className={cn('text-xs font-semibold', open ? 'text-pulse' : 'text-fathom')}>
                {statusLabel(incident.status)}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-muted">
                {formatRelative(incident.createdAt)} · Ref {incident.id}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 font-mono text-[0.52rem] uppercase tracking-wider',
              open ? 'bg-pulse/10 text-pulse' : 'bg-line/50 text-muted',
            )}
          >
            {incident.risk}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label-mono text-[0.52rem] text-muted">Held payment</p>
            <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.045em]">
              {transaction ? formatNaira(transaction.amount) : '—'}
            </p>
            <p className="mt-1 text-sm text-muted">
              To {transaction?.recipientName ?? 'Unknown recipient'} ·{' '}
              {transaction?.recipientBank}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-lumen-deep/50 px-3.5 py-2 text-right">
            <p className="label-mono text-[0.48rem] text-muted">Risk score</p>
            <p className="mt-1 font-mono text-xl font-semibold text-pulse">{incident.score}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {incident.signals.map((signal) => (
            <div
              key={signal.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-lumen-deep/35 px-3 py-2.5"
            >
              <span className="text-[0.66rem] text-muted">{signal.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-mono text-[0.52rem]',
                  toneClass(signal.tone),
                )}
              >
                {signal.value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-line bg-lumen-deep/35 px-4 py-3 text-[0.66rem] text-muted">
          <span className="flex items-center gap-1.5">
            <MessageSquareText className="size-3.5 text-fathom" />
            Guardian alert {incident.guardianAlert.status}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {incident.guardianAlert.channel} · {incident.guardianAlert.reference}
          </span>
        </div>

        {done && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-success-soft p-3 text-xs leading-relaxed text-success">
            <Check className="mt-0.5 size-4 shrink-0" />
            {done}
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        {open && !done && (
          <div className="mt-5 border-t border-line pt-4">
            {!releaseMode && !confirmCancel && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setReleaseMode(true)
                    setPinError(null)
                  }}
                  className="btn-primary flex-1 py-3 text-sm"
                >
                  Release payment
                  <ArrowRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="btn-secondary flex-1 py-3 text-sm"
                >
                  Cancel payment
                </button>
              </div>
            )}

            {confirmCancel && (
              <div className="rounded-2xl border border-pulse/20 bg-pulse-soft/45 p-4">
                <p className="text-sm font-semibold text-pulse">Cancel this payment?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  The money will return to your available balance. The decoy transaction
                  will show as cancelled in your private history.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={busy}
                    className="flex-1 rounded-full bg-pulse px-4 py-2.5 text-xs font-semibold text-lumen transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {busy ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    disabled={busy}
                    className="flex-1 rounded-full border border-line bg-lumen px-4 py-2.5 text-xs font-semibold"
                  >
                    Keep hold
                  </button>
                </div>
              </div>
            )}

            {releaseMode && (
              <div className="rounded-2xl border border-fathom/20 bg-fathom-soft/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Release with your normal PIN</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      This completes the transfer. Only use it when you are safe and
                      certain.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReleaseMode(false)}
                    aria-label="Close release panel"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-lumen text-muted"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="mt-4">
                  <PinInput
                    key={resetKey}
                    disabled={busy}
                    error={pinError}
                    onSubmit={handleRelease}
                  />
                </div>
                {busy && (
                  <p className="mt-3 text-center text-xs font-medium text-fathom">
                    Releasing…
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export function Safety() {
  const { incidents, guardian, normalPin } = useQuantoStore()
  const [unlocked, setUnlocked] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)
  const [gateKey, setGateKey] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const hasRecoveryItems = incidents.length > 0
  const openCount = incidents.filter((incident) => incident.status === 'open').length

  const unlock = (pin: string) => {
    if (pin === normalPin) {
      setGateError(null)
      setUnlocked(true)
      return
    }
    setGateError('That normal PIN is not correct.')
    setGateKey((key) => key + 1)
  }

  return (
    <div className="animate-fade-up">
      <p className="label-mono text-[0.58rem] text-fathom">Private recovery</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">Safety Center.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Review held payments, guardian alerts, and your duress protection. This area is
        intentionally separate from the main payment experience.
      </p>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="space-y-4">
          {hasRecoveryItems && !unlocked ? (
            <section className="rounded-3xl border border-line bg-lumen p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-fathom-soft text-fathom">
                  <LockKeyhole className="size-5" />
                </span>
                <div>
                  <h2 className="font-display text-2xl font-semibold">Private review</h2>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">
                    Enter your normal PIN to open the recovery queue. Your duress PIN will
                    not unlock this section.
                  </p>
                </div>
              </div>

              <div className="mx-auto mt-6 max-w-sm">
                <PinInput
                  key={gateKey}
                  error={gateError}
                  onSubmit={unlock}
                />
              </div>

              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => setShowHint((value) => !value)}
                  className="font-mono text-[0.56rem] uppercase tracking-wider text-muted/65 hover:text-vast"
                >
                  Demo hint
                </button>
                {showHint && (
                  <p className="mt-2 font-mono text-[0.62rem] text-muted">Normal PIN: 1234</p>
                )}
              </div>
            </section>
          ) : (
            <>
              {hasRecoveryItems ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl border border-line bg-lumen-deep/50 px-4 py-3">
                    <p className="text-xs text-muted">
                      {openCount > 0
                        ? `${openCount} payment${openCount === 1 ? '' : 's'} held for review`
                        : `${incidents.length} recovered payment${incidents.length === 1 ? '' : 's'} in history`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setUnlocked(false)}
                      className="text-[0.62rem] font-medium text-fathom hover:underline"
                    >
                      Lock again
                    </button>
                  </div>
                  {incidents.map((incident) => (
                    <IncidentCard key={incident.id} incident={incident} />
                  ))}
                </div>
              ) : (
                <section className="flex flex-col items-center rounded-3xl border border-line bg-lumen px-6 py-16 text-center">
                  <span className="flex size-14 items-center justify-center rounded-full bg-fathom-soft text-fathom">
                    <ShieldQuestion className="size-6" />
                  </span>
                  <h2 className="mt-5 font-display text-2xl font-semibold">
                    No recovery items
                  </h2>
                  <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">
                    If you use your duress PIN, the payment will appear here after you
                    unlock with your normal PIN.
                  </p>
                </section>
              )}
            </>
          )}

          <section className="rounded-3xl border border-line bg-lumen-deep/45 p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-fathom" />
              <h2 className="text-sm font-semibold">How a hold works</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['Silent trigger', 'The duress PIN is accepted exactly like a normal PIN.'],
                ['Attacker-facing receipt', 'The app shows a familiar completed transfer.'],
                ['Private recovery', 'The held payment waits here for your decision.'],
              ].map(([title, body], index) => (
                <div key={title} className="rounded-2xl border border-line bg-lumen p-3.5">
                  <span className="font-mono text-[0.55rem] text-fathom">0{index + 1}</span>
                  <p className="mt-2 text-xs font-semibold">{title}</p>
                  <p className="mt-1 text-[0.66rem] leading-relaxed text-muted">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-line bg-fathom p-5 text-lumen">
            <div className="flex items-center justify-between">
              <span className="label-mono text-[0.52rem] text-lumen/50">Guardian</span>
              <MessageSquareText className="size-4 text-dawn" />
            </div>
            <p className="mt-5 font-display text-2xl font-semibold">{guardian.name}</p>
            <p className="mt-1 text-xs text-lumen/50">{guardian.phone}</p>
            <div className="mt-4 flex items-center gap-2 border-t border-lumen/10 pt-3 text-[0.65rem]">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  guardian.enabled ? 'bg-success' : 'bg-glow',
                )}
              />
              {guardian.enabled ? 'Alerts enabled' : 'Alerts paused'}
            </div>
            <Link
              to="/app/settings"
              className="mt-4 flex items-center justify-between text-xs font-medium text-dawn hover:underline"
            >
              Manage guardian
              <ArrowRight className="size-3.5" />
            </Link>
          </section>

          <section className="rounded-3xl border border-line bg-lumen p-5">
            <p className="label-mono text-[0.52rem] text-muted">Duress protection</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-xs">Duress PIN armed</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-xs">Silent decoy receipt</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-xs">Local hold engine</span>
              </div>
            </div>
            <Link
              to="/app/settings"
              className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs font-medium text-fathom hover:underline"
            >
              View protection settings
              <ArrowRight className="size-3.5" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
