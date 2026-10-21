import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ReceiptText,
  X,
} from 'lucide-react'
import { TransactionRow } from '@/components/TransactionRow'
import { useBankingStore } from '@/lib/store'
import type { Transaction } from '@/lib/types'
import { cn, formatDateTime, formatNaira } from '@/lib/utils'

type Filter = 'all' | 'in' | 'out'

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'Money in' },
  { id: 'out', label: 'Money out' },
]

function TransactionDetail({
  transaction,
  onClose,
}: {
  transaction: Transaction
  onClose: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const incoming = transaction.direction === 'in'
  const rows = [
    ['Status', transaction.status === 'completed' ? 'Completed' : transaction.status],
    ['Date', formatDateTime(transaction.createdAt)],
    ['Category', transaction.category],
    ['Bank', transaction.bank],
    ...(transaction.accountNumber
      ? [['Account number', transaction.accountNumber] as const]
      : []),
    ['Reference', transaction.reference],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-vast/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transaction details"
        onClick={(event) => event.stopPropagation()}
        className="w-full animate-fade-up rounded-t-[2rem] bg-lumen p-6 shadow-soft sm:max-w-md sm:rounded-[2rem]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label-mono text-[0.55rem] text-muted">Transaction details</p>
            <p className="mt-2 font-display text-4xl font-semibold tracking-[-0.045em]">
              {incoming ? '+' : '−'}
              {formatNaira(transaction.amount)}
            </p>
            <p className="mt-1 text-sm text-muted">{transaction.counterparty}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-vast"
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          className={cn(
            'mt-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-medium',
            incoming ? 'bg-success-soft text-success' : 'bg-lumen-deep text-fathom',
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-lumen">
            {incoming ? (
              <ArrowDownLeft className="size-3.5" />
            ) : (
              <ArrowUpRight className="size-3.5" />
            )}
          </span>
          {transaction.description}
        </div>

        <div className="mt-4 divide-y divide-line rounded-2xl border border-line px-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3 text-xs">
              <span className="text-muted">{label}</span>
              <span className="max-w-[60%] truncate text-right font-medium capitalize">
                {value}
              </span>
            </div>
          ))}
        </div>

        {transaction.status === 'completed' && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[0.65rem] text-success">
            <Check className="size-3.5" />
            Completed successfully
          </div>
        )}
      </div>
    </div>
  )
}

export function Activity() {
  const transactions = useBankingStore((state) => state.transactions)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Transaction | null>(null)

  const visible = useMemo(
    () =>
      transactions.filter((transaction) =>
        filter === 'all' ? true : transaction.direction === filter,
      ),
    [transactions, filter],
  )

  const moneyIn = transactions
    .filter(
      (transaction) =>
        transaction.direction === 'in' && transaction.status === 'completed',
    )
    .reduce((total, transaction) => total + transaction.amount, 0)
  const moneyOut = transactions
    .filter(
      (transaction) =>
        transaction.direction === 'out' && transaction.status === 'completed',
    )
    .reduce((total, transaction) => total + transaction.amount, 0)

  return (
    <div className="animate-fade-up">
      <p className="label-mono text-[0.58rem] text-fathom">Your money</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">Activity.</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        Every payment in and out of your account, with the details you need to keep track.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-lumen p-5">
          <div className="flex items-center justify-between">
            <span className="label-mono text-[0.54rem] text-muted">Money in</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-success-soft text-success">
              <ArrowDownLeft className="size-4" />
            </span>
          </div>
          <p className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em]">
            {formatNaira(moneyIn)}
          </p>
        </div>
        <div className="rounded-3xl border border-line bg-lumen p-5">
          <div className="flex items-center justify-between">
            <span className="label-mono text-[0.54rem] text-muted">Money out</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-lumen-dark text-fathom">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
          <p className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em]">
            {formatNaira(moneyOut)}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex rounded-full border border-line bg-lumen p-1">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-medium transition-colors',
                filter === item.id ? 'bg-fathom text-lumen' : 'text-muted hover:text-vast',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="hidden text-[0.65rem] text-muted sm:block">
          {visible.length} transaction{visible.length === 1 ? '' : 's'}
        </span>
      </div>

      <section className="mt-4 rounded-3xl border border-line bg-lumen px-5 py-2 sm:px-6">
        {visible.length > 0 ? (
          <div className="divide-y divide-line">
            {visible.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-lumen-deep text-muted">
              <ReceiptText className="size-5" />
            </span>
            <p className="mt-4 text-sm font-semibold">No transactions here yet</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
              Payments you send or receive will appear in this view.
            </p>
          </div>
        )}
      </section>

      <p className="mt-4 text-center text-[0.62rem] text-muted">
        This demo stores activity in your browser only.
      </p>

      {selected && (
        <TransactionDetail transaction={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
