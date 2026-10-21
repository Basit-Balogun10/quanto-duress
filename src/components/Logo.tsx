import { Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  compact?: boolean
  to?: string
}

export function Logo({ className, compact = false, to = '/app' }: LogoProps) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-3 text-vast', className)}
      aria-label="Quanto home"
    >
      <span className="relative flex size-10 items-center justify-center rounded-[14px] bg-fathom text-lumen shadow-sm">
        <Landmark className="size-5" strokeWidth={2.1} />
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-lumen bg-glow" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[1.75rem] font-semibold tracking-[-0.04em]">
            Quanto
          </span>
          <span className="label-mono mt-1 block text-[0.52rem] text-muted">
            Everyday banking
          </span>
        </span>
      )}
    </Link>
  )
}
