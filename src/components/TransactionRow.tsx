import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import { cn, formatNaira, formatRelative } from '@/lib/utils'

interface TransactionRowProps {
  transaction: Transaction
  compact?: boolean
}

export function TransactionRow({ transaction, compact = false }: TransactionRowProps) {
  const incoming = transaction.direction === 'in'
  const cancelled = transaction.status === 'cancelled'

  return (
    <div
      className={cn(
        'flex items-center gap-3.5 py-3.5',
        compact ? 'px-0' : 'px-1',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          incoming ? 'bg-success-soft text-success' : 'bg-lumen-dark text-fathom',
          cancelled && 'bg-lumen-dark/50 text-muted',
        )}
      >
        {incoming ? (
          <ArrowDownLeft className="size-[18px]" strokeWidth={2.2} />
        ) : (
          <ArrowUpRight className="size-[18px]" strokeWidth={2.2} />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold', cancelled && 'text-muted line-through')}>
          {transaction.recipientName}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {cancelled ? 'Cancelled' : transaction.note} · {formatRelative(transaction.createdAt)}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            'font-mono text-sm font-semibold',
            incoming ? 'text-success' : 'text-vast',
            cancelled && 'text-muted line-through',
          )}
        >
          {incoming ? '+' : '−'}
          {formatNaira(transaction.amount)}
        </p>
        <p className="mt-0.5 text-[0.62rem] text-muted">
          {cancelled ? 'Cancelled' : transaction.recipientBank}
        </p>
      </div>
    </div>
  )
}
