import { useEffect, useState } from 'react'
import { ArrowDownToLine, X } from 'lucide-react'
import { useBankingStore } from '@/lib/store'
import { cn, formatNaira } from '@/lib/utils'

const PRESETS = [10_000, 50_000, 100_000, 500_000]
const MAX_FUNDING = 10_000_000

export function FundAccountDialog({ onClose }: { onClose: () => void }) {
  const fundAccount = useBankingStore((state) => state.fundAccount)
  const [amount, setAmount] = useState('50000')
  const value = Number(amount) || 0
  const valid = Number.isInteger(value) && value > 0 && value <= MAX_FUNDING

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const addFunds = () => {
    if (!valid) return
    fundAccount(value)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-vast/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add test money"
        onClick={(event) => event.stopPropagation()}
        className="w-full animate-fade-up rounded-t-[2rem] bg-lumen p-6 shadow-soft sm:max-w-md sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-mono text-[0.55rem] text-muted">Sandbox funding</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Add test money
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Add simulated funds so you can try transfers. This is not real money.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close test funding"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-vast"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={cn(
                'rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors',
                value === preset
                  ? 'border-fathom bg-fathom-soft/60 text-fathom'
                  : 'border-line bg-lumen-deep/40 text-muted hover:border-fathom/40',
              )}
            >
              {formatNaira(preset)}
            </button>
          ))}
        </div>

        <label className="mt-5 block">
          <span className="text-[0.68rem] font-medium text-muted">Amount</span>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg text-muted">
              ₦
            </span>
            <input
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value.replace(/\D/g, '').slice(0, 8),
                )
              }
              inputMode="numeric"
              autoComplete="off"
              aria-label="Test funding amount"
              className="w-full rounded-2xl border border-line bg-lumen pl-9 pr-4 py-3.5 font-mono text-sm outline-none transition-colors focus:border-fathom"
            />
          </div>
        </label>

        {!valid && (
          <p className="mt-3 text-xs font-medium text-danger" role="alert">
            Enter an amount between ₦1 and {formatNaira(MAX_FUNDING)}.
          </p>
        )}

        <button
          type="button"
          onClick={addFunds}
          disabled={!valid}
          className="btn-primary mt-5 w-full justify-center py-3.5 text-sm disabled:opacity-50"
        >
          <ArrowDownToLine className="size-4" />
          Add test money
        </button>

        <p className="mt-4 text-center text-[0.62rem] leading-relaxed text-muted">
          Funds are stored only in this browser for demonstration.
        </p>
      </div>
    </div>
  )
}
