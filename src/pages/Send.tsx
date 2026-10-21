import { useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Info,
  LockKeyhole,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PaymentError, submitPayment } from '@/lib/api'
import { recipients } from '@/lib/fixtures'
import { selectAvailableBalance, useQuantoStore } from '@/lib/store'
import type { PaymentResult, Recipient, Transaction } from '@/lib/types'
import { formatNaira } from '@/lib/utils'
import { PinInput } from '@/components/PinInput'
import { TransferReceipt } from '@/components/TransferReceipt'

type Step = 'compose' | 'pin' | 'processing' | 'receipt'

export function Send() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const store = useQuantoStore()
  const available = selectAvailableBalance(store)

  const initialRecipient =
    recipients.find((recipient) => recipient.id === params.get('to')) ?? null
  const [selected, setSelected] = useState<Recipient | null>(initialRecipient)
  const [query, setQuery] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [step, setStep] = useState<Step>('compose')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinResetKey, setPinResetKey] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const [showHints, setShowHints] = useState(false)

  const filtered = recipients.filter((recipient) =>
    `${recipient.name} ${recipient.bank}`.toLowerCase().includes(query.toLowerCase()),
  )

  const numericAmount = Number(amount.replace(/,/g, '')) || 0
  const overBalance = numericAmount > available

  const startPin = () => {
    if (!selected) {
      setFormError('Choose a recipient first.')
      return
    }
    if (numericAmount <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }
    if (overBalance) {
      setFormError('This amount is above your available balance.')
      return
    }
    setFormError(null)
    setPinError(null)
    setStep('pin')
  }

  const handlePin = async (
    pin: string,
    meta: { elapsedMs: number; corrections: number },
  ) => {
    if (!selected) return
    setStep('processing')
    setPinError(null)
    try {
      const result: PaymentResult = await submitPayment({
        recipient: selected,
        amount: numericAmount,
        note: note.trim(),
        pin,
        pinEntryMs: meta.elapsedMs,
        corrections: meta.corrections,
      })
      setReceipt(result.transaction)
      setStep('receipt')
    } catch (error) {
      const message =
        error instanceof PaymentError
          ? error.message
          : 'Something went wrong. Please try again.'
      setPinError(message)
      setPinResetKey((key) => key + 1)
      setStep('pin')
    }
  }

  return (
    <div className="animate-fade-up">
      <Link
        to="/app"
        className="inline-flex items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-vast"
      >
        <ArrowLeft className="size-3.5" />
        Back home
      </Link>

      <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="label-mono text-[0.58rem] text-fathom">New transfer</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Send money.</h1>
        </div>
        <p className="text-sm text-muted">
          Available{' '}
          <span className="font-mono font-semibold text-vast">{formatNaira(available)}</span>
        </p>
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Recipient</h2>
            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-[0.68rem] font-medium text-fathom hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {selected ? (
            <div className="mt-5 rounded-2xl border border-fathom/25 bg-fathom-soft/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-dawn font-display text-lg font-semibold text-fathom-deep">
                  {selected.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {selected.bank} · {selected.accountNumber}
                  </p>
                </div>
                <span className="flex size-6 items-center justify-center rounded-full bg-fathom text-lumen">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              </div>
              {selected.trusted && (
                <p className="mt-3 flex items-center gap-1.5 border-t border-fathom/10 pt-3 text-[0.68rem] text-fathom">
                  <ShieldCheck className="size-3.5" />
                  Saved recipient
                </p>
              )}
            </div>
          ) : (
            <>
              <label className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-lumen-deep/50 px-3.5 py-3">
                <Search className="size-4 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name or bank"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted/65"
                  aria-label="Search recipients"
                />
              </label>

              <div className="mt-3 space-y-1.5">
                {filtered.map((recipient) => (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => {
                      setSelected(recipient)
                      setFormError(null)
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-lumen-deep/60"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-lumen-dark/70 font-display text-sm font-semibold text-fathom-deep">
                      {recipient.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{recipient.name}</span>
                      <span className="block text-[0.68rem] text-muted">{recipient.bank}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted" />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted">No recipients found.</p>
                )}
              </div>
            </>
          )}

          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-lumen-deep/60 p-3.5 text-[0.68rem] leading-relaxed text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0 text-fathom" />
            Transfers are protected by your PIN. In this demo, duress holds are simulated
            locally.
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
          <h2 className="font-display text-2xl font-semibold">Amount</h2>

          <div className="mt-5 rounded-2xl border border-line bg-lumen-deep/45 p-4">
            <label htmlFor="amount" className="label-mono text-[0.55rem] text-muted">
              You send
            </label>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-display text-3xl text-muted">₦</span>
              <input
                id="amount"
                value={amount}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d]/g, '').slice(0, 9)
                  setAmount(raw)
                  setFormError(null)
                }}
                inputMode="numeric"
                placeholder="0"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-display text-5xl font-semibold tracking-[-0.04em] outline-none placeholder:text-lumen-dark sm:text-6xl"
              />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-[0.68rem] text-muted">Available {formatNaira(available)}</span>
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(available)))}
                className="rounded-full border border-line bg-lumen px-2.5 py-1 text-[0.62rem] font-medium text-fathom hover:bg-lumen-deep"
              >
                Max
              </button>
            </div>
          </div>

          {overBalance && (
            <p className="mt-2 text-xs font-medium text-danger">
              That is more than your available balance.
            </p>
          )}

          <div className="mt-5">
            <label htmlFor="note" className="text-xs font-medium text-muted">
              Note <span className="font-normal text-muted/70">(optional)</span>
            </label>
            <input
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 60))}
              placeholder="What is this for?"
              className="mt-2 w-full rounded-2xl border border-line bg-lumen px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-fathom"
            />
          </div>

          {formError && (
            <p className="mt-3 text-sm font-medium text-danger" role="alert">
              {formError}
            </p>
          )}

          <button
            type="button"
            onClick={startPin}
            disabled={!selected || numericAmount <= 0 || overBalance}
            className="btn-primary mt-5 w-full py-4 disabled:opacity-45"
          >
            Continue
            <LockKeyhole className="size-4" />
          </button>

          <p className="mt-3 text-center text-[0.62rem] text-muted">
            You will confirm with your 4-digit PIN.
          </p>
        </section>
      </div>

      {step !== 'compose' && step !== 'receipt' && selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-vast/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm transfer with PIN"
            className="w-full animate-fade-up rounded-t-[2rem] bg-lumen p-6 shadow-soft sm:max-w-sm sm:rounded-[2rem]"
          >
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-fathom-soft text-fathom">
                <LockKeyhole className="size-5" />
              </span>
              <p className="label-mono mt-4 text-[0.56rem] text-muted">Confirm transfer</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
                {formatNaira(numericAmount)}
              </p>
              <p className="mt-1 text-sm text-muted">to {selected.name}</p>
            </div>

            <div className="mt-6">
              <PinInput
                key={pinResetKey}
                disabled={step === 'processing'}
                error={pinError}
                onSubmit={handlePin}
              />
            </div>

            {step === 'processing' && (
              <p className="mt-4 text-center text-xs font-medium text-fathom">
                Verifying…
              </p>
            )}

            {step === 'pin' && (
              <button
                type="button"
                onClick={() => {
                  setStep('compose')
                  setPinError(null)
                }}
                className="mx-auto mt-5 block text-xs font-medium text-muted hover:text-vast"
              >
                Cancel
              </button>
            )}

            {step === 'pin' && (
              <div className="mt-5 border-t border-line pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowHints((value) => !value)}
                  className="font-mono text-[0.56rem] uppercase tracking-wider text-muted/65 hover:text-vast"
                >
                  Demo PINs
                </button>
                {showHints && (
                  <p className="mt-2 font-mono text-[0.62rem] text-muted">
                    Normal 1234 · Duress 9111
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {receipt && (
        <TransferReceipt
          transaction={receipt}
          onDone={() => {
            setReceipt(null)
            setStep('compose')
            navigate('/app')
          }}
        />
      )}
    </div>
  )
}
