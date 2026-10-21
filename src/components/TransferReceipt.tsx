import { Check, ShieldCheck } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import { formatNaira } from '@/lib/utils'

interface TransferReceiptProps {
  transaction: Transaction
  onDone: () => void
}

export function TransferReceipt({ transaction, onDone }: TransferReceiptProps) {
  const date = new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(transaction.createdAt))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-vast/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transfer receipt"
        className="w-full animate-fade-up rounded-t-[2rem] bg-lumen p-6 shadow-soft sm:max-w-sm sm:rounded-[2rem]"
      >
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success-soft">
          <div className="flex size-14 items-center justify-center rounded-full bg-success text-lumen">
            <Check className="size-7" strokeWidth={3} />
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="label-mono text-[0.58rem] text-success">Transfer successful</p>
          <p className="mt-2 font-display text-5xl font-semibold tracking-[-0.05em]">
            {formatNaira(transaction.amount)}
          </p>
          <p className="mt-2 text-sm text-muted">
            Sent to <span className="font-semibold text-vast">{transaction.recipientName}</span>
          </p>
          <p className="text-sm text-muted">{transaction.recipientBank}</p>
        </div>

        <div className="mt-6 space-y-3 rounded-2xl border border-line bg-lumen-deep/60 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Date</span>
            <span className="text-right font-medium">{date}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Reference</span>
            <span className="font-mono text-xs font-medium">{transaction.id}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Note</span>
            <span className="max-w-[11rem] truncate text-right font-medium">{transaction.note}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[0.68rem] text-muted">
          <ShieldCheck className="size-3.5 text-fathom" />
          Protected by Quanto
        </div>

        <button type="button" onClick={onDone} className="btn-primary mt-5 w-full">
          Done
        </button>
      </div>
    </div>
  )
}
