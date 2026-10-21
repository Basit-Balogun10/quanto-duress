import type { Transaction } from '@/lib/types'
import { cn, formatNaira, formatRelative } from '@/lib/utils'
import { TransactionIcon } from './TransactionIcon'

interface TransactionRowProps {
  transaction: Transaction
  onSelect?: (transaction: Transaction) => void
}

export function TransactionRow({ transaction, onSelect }: TransactionRowProps) {
  const incoming = transaction.direction === 'in'
  const failed = transaction.status === 'failed'

  const content = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full',
          incoming ? 'bg-success-soft text-success' : 'bg-lumen-dark text-fathom',
          failed && 'bg-pulse-soft text-pulse',
        )}
      >
        <TransactionIcon transaction={transaction} className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1 text-left">
        <p className={cn('truncate text-sm font-semibold', failed && 'text-muted line-through')}>
          {transaction.counterparty}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {transaction.description} · {formatRelative(transaction.createdAt)}
        </p>
      </div>

      <div className="text-right">
        <p
          className={cn(
            'font-mono text-sm font-semibold',
            incoming ? 'text-success' : 'text-vast',
            failed && 'text-muted line-through',
          )}
        >
          {incoming ? '+' : '−'}
          {formatNaira(transaction.amount)}
        </p>
        <p className="mt-0.5 text-[0.62rem] text-muted">
          {failed ? 'Failed' : transaction.status === 'pending' ? 'Pending' : transaction.bank}
        </p>
      </div>
    </>
  )

  const className = cn(
    'flex w-full items-center gap-3.5 px-1 py-3.5',
    onSelect && 'rounded-xl text-left transition-colors hover:bg-lumen-deep/60',
  )

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(transaction)} className={className}>
        {content}
      </button>
    )
  }

  return <div className={className}>{content}</div>
}
