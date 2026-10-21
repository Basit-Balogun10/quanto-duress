import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { recipients } from '@/lib/fixtures'
import { selectAvailableBalance, useQuantoStore } from '@/lib/store'
import { formatNaira } from '@/lib/utils'
import { TransactionRow } from '@/components/TransactionRow'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const state = useQuantoStore()
  const available = selectAvailableBalance(state)
  const recent = state.transactions.slice(0, 4)
  const guardian = state.guardian

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-mono text-[0.58rem] text-muted">{greeting()}</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Ada.</h1>
        </div>
        <Link
          to="/app/safety"
          className="hidden items-center gap-2 rounded-full border border-line bg-lumen-deep/60 px-3.5 py-2 text-xs font-medium text-fathom sm:flex"
        >
          <ShieldCheck className="size-3.5" />
          Protection active
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-fathom p-6 text-lumen shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-lumen/10" />
        <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full border border-lumen/10" />
        <div className="pointer-events-none absolute bottom-0 right-16 size-32 translate-y-1/2 rounded-full bg-dawn/10 blur-2xl" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="label-mono text-[0.56rem] text-lumen/50">Available to spend</span>
            <span className="rounded-full bg-lumen/10 px-2 py-0.5 font-mono text-[0.55rem] text-lumen/55">
              {state.owner.accountMask}
            </span>
          </div>
          <p className="mt-3 font-display text-[clamp(2.8rem,9vw,4.5rem)] font-semibold leading-none tracking-[-0.055em]">
            {formatNaira(available)}
          </p>
          <p className="mt-3 text-xs text-lumen/45">
            Your account is ready for payments. Protection stays quietly in the background.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              to="/app/send"
              className="inline-flex items-center gap-2 rounded-full bg-lumen px-5 py-3 text-sm font-semibold text-fathom transition-colors hover:bg-dawn"
            >
              Send money
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              to="/app/activity"
              className="inline-flex items-center gap-2 rounded-full border border-lumen/20 px-5 py-3 text-sm font-semibold text-lumen/85 transition-colors hover:bg-lumen/10"
            >
              View activity
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-lumen/10 pt-4 text-[0.68rem] text-lumen/45">
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="size-3.5" />
              Duress PIN set
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquareText className="size-3.5" />
              Guardian {guardian.enabled ? 'on standby' : 'paused'}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-lumen-deep/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="label-mono text-[0.55rem] text-muted">Quick send</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold">People you trust</h2>
          </div>
          <Link
            to="/app/send"
            className="flex items-center gap-1 text-xs font-medium text-fathom hover:underline"
          >
            All recipients
            <ChevronRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {recipients.map((recipient) => (
            <Link
              key={recipient.id}
              to={`/app/send?to=${recipient.id}`}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-line bg-lumen p-3.5 transition-all hover:-translate-y-0.5 hover:border-fathom/30 hover:shadow-card"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-dawn font-display text-base font-semibold text-fathom-deep">
                {recipient.initials}
              </span>
              <span className="w-full truncate text-xs font-semibold">{recipient.name}</span>
              <span className="-mt-1.5 w-full truncate text-[0.62rem] text-muted">
                {recipient.bank}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Recent activity</h2>
            <Link
              to="/app/activity"
              className="flex items-center gap-1 text-xs font-medium text-fathom hover:underline"
            >
              See all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-2 divide-y divide-line">
            {recent.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} compact />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-lumen-deep/55 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="label-mono text-[0.55rem] text-fathom">Security</p>
            <span className="flex size-9 items-center justify-center rounded-full bg-fathom text-lumen">
              <ShieldCheck className="size-4" />
            </span>
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold leading-snug">
            Quiet protection, always on.
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-lumen p-3.5">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-fathom" />
              <div>
                <p className="text-xs font-semibold">Duress PIN armed</p>
                <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">
                  A forced transfer can be silently held.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-lumen p-3.5">
              <UserRoundCheck className="mt-0.5 size-4 shrink-0 text-fathom" />
              <div>
                <p className="text-xs font-semibold">{guardian.name}</p>
                <p className="mt-0.5 text-[0.68rem] leading-relaxed text-muted">
                  Trusted contact · {guardian.enabled ? 'alerts enabled' : 'alerts paused'}
                </p>
              </div>
            </div>
          </div>
          <Link
            to="/app/safety"
            className="mt-4 flex items-center justify-between rounded-2xl bg-fathom px-4 py-3 text-sm font-semibold text-lumen transition-colors hover:bg-fathom-deep"
          >
            Safety Center
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>

      <p className="pt-1 text-center text-[0.62rem] text-muted">
        Demo workspace · Local browser storage only
      </p>
    </div>
  )
}
