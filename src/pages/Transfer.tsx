import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Info,
  Landmark,
  LockKeyhole,
  Search,
  UserPlus,
  WifiOff,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PinInput } from '@/components/PinInput'
import { RecoveryDialog } from '@/components/RecoveryDialog'
import { TransferReceipt } from '@/components/TransferReceipt'
import { NetworkError, submitTransfer, TransferError } from '@/lib/api'
import { selectAvailableBalance, useBankingStore } from '@/lib/store'
import type { Beneficiary, Transaction } from '@/lib/types'
import { cn, formatNaira, initialsOf } from '@/lib/utils'

type Step =
  | 'recipient'
  | 'amount'
  | 'review'
  | 'pin'
  | 'processing'
  | 'success'
  | 'failed'

const banks = [
  'Access Bank',
  'First Bank',
  'GTBank',
  'Kuda',
  'Moniepoint',
  'Opay',
  'Stanbic IBTC',
  'UBA',
  'Zenith Bank',
]

const stepLabels = ['Recipient', 'Amount', 'Review']

function stepNumber(step: Step) {
  if (step === 'recipient') return 0
  if (step === 'amount') return 1
  return 2
}

export function Transfer() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const state = useBankingStore()
  const initialRecipient =
    state.beneficiaries.find((beneficiary) => beneficiary.id === params.get('to')) ?? null

  const [selected, setSelected] = useState<Beneficiary | null>(initialRecipient)
  const [step, setStep] = useState<Step>(initialRecipient ? 'amount' : 'recipient')
  const [recipientMode, setRecipientMode] = useState<'saved' | 'new'>('saved')
  const [query, setQuery] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinResetKey, setPinResetKey] = useState(0)
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [restored, setRestored] = useState(false)

  const [newName, setNewName] = useState('')
  const [newBank, setNewBank] = useState(banks[0])
  const [newAccount, setNewAccount] = useState('')

  const availableBalance = selectAvailableBalance(state)
  const filtered = state.beneficiaries.filter((beneficiary) =>
    `${beneficiary.name} ${beneficiary.bank}`.toLowerCase().includes(query.toLowerCase()),
  )
  const numericAmount = Number(amount) || 0
  const overBalance = numericAmount > availableBalance

  const activeStep = stepNumber(step)

  const chooseRecipient = (beneficiary: Beneficiary) => {
    setSelected(beneficiary)
    setFormError(null)
    setStep('amount')
  }

  const useNewRecipient = () => {
    if (newName.trim().length < 2) {
      setFormError('Enter the recipient name.')
      return
    }
    if (newAccount.length !== 10) {
      setFormError('Account number must be 10 digits.')
      return
    }
    setSelected({
      id: `beneficiary_${Date.now()}`,
      name: newName.trim(),
      bank: newBank,
      accountNumber: newAccount,
      initials: initialsOf(newName),
    })
    setFormError(null)
    setStep('amount')
  }

  const continueToReview = () => {
    if (!selected) return
    if (numericAmount <= 0) {
      setFormError('Enter an amount greater than zero.')
      return
    }
    if (overBalance) {
      setFormError('This amount is above your available balance.')
      return
    }
    setFormError(null)
    setStep('review')
  }

  const goBack = () => {
    if (step === 'recipient') {
      navigate('/app')
      return
    }
    if (step === 'amount') {
      setStep('recipient')
      return
    }
    if (step === 'review') {
      setStep('amount')
    }
    if (step === 'failed') {
      setRestored(false)
      setStep('review')
    }
  }

  const handlePin = async (pin: string) => {
    if (!selected) return
    setStep('processing')
    setPinError(null)
    try {
      const result = await submitTransfer({
        beneficiary: selected,
        amount: numericAmount,
        note,
        pin,
      })
      setReceipt(result.transaction)
      setStep('success')
    } catch (error) {
      setPinResetKey((key) => key + 1)
      if (error instanceof NetworkError) {
        setPinError(null)
        setStep('failed')
        return
      }
      setPinError(
        error instanceof TransferError
          ? error.message
          : 'Something went wrong. Please try again.',
      )
      setStep('pin')
    }
  }

  return (
    <div className="animate-fade-up">
      {step !== 'success' && (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-muted transition-colors hover:text-vast"
        >
          <ArrowLeft className="size-3.5" />
          {step === 'recipient' ? 'Back home' : 'Back'}
        </button>
      )}

      <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="label-mono text-[0.58rem] text-fathom">New transfer</p>
          <h1 className="display mt-2 text-3xl sm:text-5xl">Send money</h1>
        </div>
        <p className="text-sm text-muted">
          Available{' '}
          <span className="font-mono font-semibold text-vast">
            {formatNaira(availableBalance)}
          </span>
        </p>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {stepLabels.map((label, index) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full font-mono text-[0.58rem] transition-colors',
                  index < activeStep
                    ? 'bg-fathom text-lumen'
                    : index === activeStep
                      ? 'bg-dawn text-fathom-deep'
                      : 'bg-lumen-dark text-muted',
                )}
              >
                {index < activeStep ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden text-[0.65rem] font-medium sm:block',
                  index === activeStep ? 'text-vast' : 'text-muted',
                )}
              >
                {label}
              </span>
            </div>
            {index < stepLabels.length - 1 && (
              <span
                className={cn(
                  'h-px flex-1',
                  index < activeStep ? 'bg-fathom' : 'bg-line',
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-3xl border border-line bg-lumen p-5 sm:p-6">
        {step === 'recipient' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold sm:text-2xl">Who are you paying?</h2>
              <div className="flex rounded-full border border-line bg-lumen p-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode('saved')
                    setFormError(null)
                  }}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[0.65rem] font-medium transition-colors',
                    recipientMode === 'saved'
                      ? 'bg-fathom text-lumen'
                      : 'text-muted hover:text-vast',
                  )}
                >
                  Saved
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientMode('new')
                    setFormError(null)
                  }}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[0.65rem] font-medium transition-colors',
                    recipientMode === 'new'
                      ? 'bg-fathom text-lumen'
                      : 'text-muted hover:text-vast',
                  )}
                >
                  New recipient
                </button>
              </div>
            </div>

            {recipientMode === 'saved' ? (
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

                <div className="mt-3 divide-y divide-line">
                  {filtered.map((beneficiary) => (
                    <button
                      key={beneficiary.id}
                      type="button"
                      onClick={() => chooseRecipient(beneficiary)}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-3 text-left transition-colors hover:bg-lumen-deep/60"
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-dawn font-display text-sm font-semibold text-fathom-deep">
                        {beneficiary.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {beneficiary.name}
                        </span>
                        <span className="block text-[0.68rem] text-muted">
                          {beneficiary.bank} · {beneficiary.accountNumber}
                        </span>
                      </span>
                      <ChevronRight className="size-4 text-muted" />
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="py-10 text-center text-xs text-muted">
                      No saved recipients match that search.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setRecipientMode('new')}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-left transition-colors hover:border-fathom/40 hover:bg-lumen-deep/40"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-lumen-deep text-fathom">
                    <UserPlus className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">Send to someone new</span>
                    <span className="block text-[0.65rem] text-muted">
                      Enter their bank account details
                    </span>
                  </span>
                </button>
              </>
            ) : (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-[0.68rem] font-medium text-muted">Recipient name</span>
                  <input
                    value={newName}
                    onChange={(event) => {
                      setNewName(event.target.value.slice(0, 60))
                      setFormError(null)
                    }}
                    placeholder="e.g. Ada Okafor"
                    className="mt-2 w-full rounded-2xl border border-line bg-lumen px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-fathom"
                  />
                </label>

                <label className="block">
                  <span className="text-[0.68rem] font-medium text-muted">Bank</span>
                  <div className="relative mt-2">
                    <Landmark className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                    <select
                      value={newBank}
                      onChange={(event) => setNewBank(event.target.value)}
                      className="w-full appearance-none rounded-2xl border border-line bg-lumen py-3.5 pl-11 pr-4 text-sm outline-none transition-colors focus:border-fathom"
                    >
                      {banks.map((bank) => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="block">
                  <span className="text-[0.68rem] font-medium text-muted">Account number</span>
                  <input
                    value={newAccount}
                    onChange={(event) => {
                      setNewAccount(event.target.value.replace(/\D/g, '').slice(0, 10))
                      setFormError(null)
                    }}
                    inputMode="numeric"
                    placeholder="10-digit account number"
                    className="mt-2 w-full rounded-2xl border border-line bg-lumen px-4 py-3.5 font-mono text-sm outline-none transition-colors placeholder:font-sans placeholder:text-muted/60 focus:border-fathom"
                  />
                  <span className="mt-1.5 block text-[0.62rem] text-muted">
                    {newAccount.length}/10 digits
                  </span>
                </label>

                {formError && (
                  <p className="text-xs font-medium text-danger" role="alert">
                    {formError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={useNewRecipient}
                  className="btn-primary w-full py-3.5 text-sm"
                >
                  Continue
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'amount' && selected && (
          <div>
            <div className="flex items-center gap-3 rounded-2xl border border-fathom/20 bg-fathom-soft/55 p-3.5">
              <span className="flex size-11 items-center justify-center rounded-full bg-dawn font-display text-base font-semibold text-fathom-deep">
                {selected.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selected.name}</p>
                <p className="text-[0.68rem] text-muted">
                  {selected.bank} · {selected.accountNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('recipient')}
                className="text-[0.65rem] font-medium text-fathom hover:underline"
              >
                Change
              </button>
            </div>

            <h2 className="mt-6 font-display text-xl font-semibold sm:text-2xl">How much?</h2>
            <div className="mt-3 rounded-2xl border border-line bg-lumen-deep/45 p-4">
              <label htmlFor="transfer-amount" className="label-mono text-[0.55rem] text-muted">
                Amount
              </label>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-display text-3xl text-muted">₦</span>
                <input
                  id="transfer-amount"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value.replace(/\D/g, '').slice(0, 9))
                    setFormError(null)
                  }}
                  inputMode="numeric"
                  placeholder="0"
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent font-display text-4xl font-semibold tracking-[-0.04em] outline-none placeholder:text-lumen-dark sm:text-6xl"
                />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="text-[0.68rem] text-muted">
                  Available {formatNaira(availableBalance)}
                </span>
                <span className="font-mono text-[0.6rem] text-muted">No fees</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[5000, 10000, 20000, 50000].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className="rounded-full border border-line bg-lumen px-3.5 py-2 font-mono text-[0.62rem] text-muted transition-colors hover:border-fathom/40 hover:text-fathom"
                >
                  {formatNaira(value)}
                </button>
              ))}
            </div>

            {overBalance && (
              <p className="mt-3 text-xs font-medium text-danger">
                {availableBalance === 0
                  ? 'This account has no money available to send.'
                  : 'That is more than your available balance.'}
              </p>
            )}

            <label htmlFor="transfer-note" className="mt-5 block text-xs font-medium text-muted">
              Note <span className="font-normal text-muted/70">(optional)</span>
            </label>
            <input
              id="transfer-note"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 60))}
              placeholder="What is this for?"
              className="mt-2 w-full rounded-2xl border border-line bg-lumen px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-fathom"
            />

            {formError && (
              <p className="mt-3 text-sm font-medium text-danger" role="alert">
                {formError}
              </p>
            )}

            <button
              type="button"
              onClick={continueToReview}
              disabled={numericAmount <= 0 || overBalance}
              className="btn-primary mt-5 w-full py-3.5 text-sm disabled:opacity-45"
            >
              Review transfer
              <ArrowRight className="size-4" />
            </button>
          </div>
        )}

        {step === 'review' && selected && (
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">Review and confirm</h2>
            <p className="mt-1 text-xs text-muted">
              Check the details before entering your PIN.
            </p>

            <div className="mt-5 rounded-2xl border border-line bg-lumen-deep/40 p-5 text-center">
              <p className="label-mono text-[0.52rem] text-muted">You are sending</p>
              <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                {formatNaira(numericAmount)}
              </p>
              <p className="mt-1 text-sm text-muted">to {selected.name}</p>
            </div>

            <div className="mt-4 divide-y divide-line rounded-2xl border border-line px-4">
              {[
                ['Recipient', selected.name],
                ['Bank', selected.bank],
                ['Account number', selected.accountNumber],
                ['Note', note.trim() || 'Transfer'],
                ['Fee', formatNaira(0)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="max-w-[62%] truncate text-right font-medium">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
                <span className="font-semibold">Total</span>
                <span className="font-mono font-semibold">{formatNaira(numericAmount)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-lumen-deep/55 p-3.5 text-[0.68rem] leading-relaxed text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0 text-fathom" />
              Transfers are processed instantly.
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setStep('amount')}
                className="btn-secondary flex-1 py-3.5 text-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinError(null)
                  setStep('pin')
                }}
                className="btn-primary flex-[1.4] py-3.5 text-sm"
              >
                Confirm transfer
                <LockKeyhole className="size-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'failed' && selected && (
          <div className="py-2 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-pulse-soft text-danger">
              <WifiOff className="size-6" />
            </span>
            <p className="label-mono mt-5 text-[0.56rem] text-danger">Transfer failed</p>
            <h2 className="mx-auto mt-2 max-w-sm font-display text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
              We couldn&apos;t reach the network
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              No money has left your account. Check your connection and try again.
            </p>

            <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-line bg-lumen-deep/40 p-4 text-left">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-muted">Attempted transfer</span>
                <span className="font-mono font-semibold">{formatNaira(numericAmount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                <span className="text-muted">Recipient</span>
                <span className="max-w-[60%] truncate font-medium">{selected.name}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                <span className="text-muted">Status</span>
                <span className="rounded-full bg-pulse-soft px-2.5 py-1 text-[0.6rem] font-semibold text-danger">
                  Failed
                </span>
              </div>
            </div>

            {restored && (
              <p className="mx-auto mt-4 max-w-sm rounded-2xl bg-success-soft px-4 py-3 text-xs font-medium text-success">
                Connection restored. You can try this transfer again.
              </p>
            )}

            <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setRestored(false)
                  setStep('review')
                }}
                className="btn-primary w-full py-3.5 text-sm"
              >
                Try again
                <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setRecoveryOpen(true)}
                className="btn-secondary w-full py-3.5 text-sm"
              >
                Restore connection
              </button>
              <button
                type="button"
                onClick={() => navigate('/app')}
                className="py-2 text-xs font-medium text-muted transition-colors hover:text-vast"
              >
                Back home
              </button>
            </div>
          </div>
        )}
      </div>

      {(step === 'pin' || step === 'processing') && selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-vast/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Enter transfer PIN"
            className="w-full animate-fade-up rounded-t-[2rem] bg-lumen p-6 shadow-soft sm:max-w-sm sm:rounded-[2rem]"
          >
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-fathom-soft text-fathom">
                <LockKeyhole className="size-5" />
              </span>
              <p className="label-mono mt-4 text-[0.56rem] text-muted">Confirm transfer</p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
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

            {step === 'processing' ? (
              <p className="mt-4 text-center text-xs font-medium text-fathom">Sending…</p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStep('review')
                  setPinError(null)
                }}
                className="mx-auto mt-5 block text-xs font-medium text-muted hover:text-vast"
              >
                Cancel
              </button>
            )}

            {!state.duressActive && (
              <p className="mt-5 border-t border-line pt-3 text-center font-mono text-[0.56rem] uppercase tracking-wider text-muted/60">
                PIN: {state.pin}
              </p>
            )}
          </div>
        </div>
      )}

      {recoveryOpen && (
        <RecoveryDialog
          onClose={() => setRecoveryOpen(false)}
          onRestored={() => setRestored(true)}
        />
      )}

      {step === 'success' && receipt && (
        <TransferReceipt
          transaction={receipt}
          onDone={() => {
            setReceipt(null)
            navigate('/app')
          }}
        />
      )}
    </div>
  )
}
