import { useEffect, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Landmark } from 'lucide-react'
import { Link } from 'react-router-dom'
import { requestSilentFailureRecovery } from '@/lib/silentFailureCue'
import { useBankingStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const HOLD_DURATION_MS = 2500
const MOVE_TOLERANCE_PX = 12

interface LogoProps {
  className?: string
  compact?: boolean
  to?: string
}

export function Logo({ className, compact = false, to = '/app' }: LogoProps) {
  const silentFailure = useBankingStore((state) => state.silentFailure)
  const silentFailureActive = useBankingStore((state) => state.silentFailureActive)
  const triggerSilentFailure = useBankingStore((state) => state.triggerSilentFailure)
  const holdTimer = useRef<number | null>(null)
  const startPoint = useRef({ x: 0, y: 0 })
  const triggered = useRef(false)

  const cancelHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  useEffect(() => cancelHold, [])

  const beginHold = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || !silentFailure) return

    triggered.current = false
    startPoint.current = { x: event.clientX, y: event.clientY }
    cancelHold()
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null
      triggered.current = true
      if (silentFailureActive) {
        requestSilentFailureRecovery()
      } else {
        triggerSilentFailure('logo-hold')
      }
    }, HOLD_DURATION_MS)
  }

  const moveHold = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (holdTimer.current === null) return

    const distance = Math.hypot(
      event.clientX - startPoint.current.x,
      event.clientY - startPoint.current.y,
    )
    if (distance > MOVE_TOLERANCE_PX) cancelHold()
  }

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!triggered.current) return
    triggered.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  const handleContextMenu = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (silentFailure) event.preventDefault()
  }

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex select-none items-center gap-3 text-vast [-webkit-touch-callout:none]',
        className,
      )}
      aria-label="Quanto home"
      draggable={false}
      onPointerDown={beginHold}
      onPointerMove={moveHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
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
