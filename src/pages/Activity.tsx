import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from 'lucide-react'
import { TransactionRow } from '@/components/TransactionRow'
import { useQuantoStore } from '@/lib/store'
import { cn, formatNaira } from '@/lib/utils'

type Filter = 'all' | 'in' | 'out'

const filters: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'Money in' },
  { id: 'out', label: 'Money out' },
]

export function Activity() {
  const transactions = useQuantoStore((state) => state.transactions)
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(
    () =>
      transactions.filter((transaction) =>
        filter === 'all' ? true : transaction.direction === filter,
      ),
    [transactions, filter],
  )

  const moneyIn = transactions
    .filter((transaction) => transaction.direction === 'in')
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
                filter === item.id
                  ? 'bg-fathom text-lumen'
                  : 'text-muted hover:text-vast',
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
              <TransactionRow key={transaction.id} transaction={transaction} />
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
    </div>
  )
}
