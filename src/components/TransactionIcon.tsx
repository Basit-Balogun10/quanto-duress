import {
  ArrowDownLeft,
  ArrowUpRight,
  CarFront,
  CircleEllipsis,
  Clapperboard,
  HeartPulse,
  PiggyBank,
  ReceiptText,
  ShoppingBag,
  Utensils,
} from 'lucide-react'
import type { Transaction } from '@/lib/types'

interface TransactionIconProps {
  transaction: Transaction
  className?: string
}

export function TransactionIcon({ transaction, className }: TransactionIconProps) {
  const iconProps = { className, strokeWidth: 1.9 }

  if (transaction.direction === 'in') return <ArrowDownLeft {...iconProps} />
  if (transaction.category === 'transfer') return <ArrowUpRight {...iconProps} />
  if (transaction.category === 'food') return <Utensils {...iconProps} />
  if (transaction.category === 'transport') return <CarFront {...iconProps} />
  if (transaction.category === 'bills') return <ReceiptText {...iconProps} />
  if (transaction.category === 'shopping') return <ShoppingBag {...iconProps} />
  if (transaction.category === 'entertainment') return <Clapperboard {...iconProps} />
  if (transaction.category === 'health') return <HeartPulse {...iconProps} />
  if (transaction.category === 'savings') return <PiggyBank {...iconProps} />
  return <CircleEllipsis {...iconProps} />
}
