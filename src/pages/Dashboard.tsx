import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  History,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { TransactionRow } from '@/components/TransactionRow'
import {
  selectAvailableBalance,
  selectMonthlyIncome,
  selectMonthlySpending,
  useBankingStore,
} from '@/lib/store'
import { formatNaira } from '@/lib/utils'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const state = useBankingStore()
  const [showBalance, setShowBalance] = useState(true)
  const [copied, setCopied] = useState(false)

  const availableBalance = selectAvailableBalance(state)
  const monthlySpending = selectMonthlySpending(state)
  const monthlyIncome = selectMonthlyIncome(state)
  const spendingPercentage = Math.min(
    Math.round((monthlySpending / state.monthlyBudget) * 100),
    100,
  )
  const remainingBudget = Math.max(state.monthlyBudget - monthlySpending, 0)
  const favorites = state.beneficiaries.filter((beneficiary) => beneficiary.favorite)
  const recent = state.transactions.slice(0, 5)

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(state.owner.accountNumber)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-mono text-[0.58rem] text-muted">{greeting()}</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{state.owner.firstName}.</h1>
        </div>
        <Link
          to="/app/activity"
          className="hidden items-center gap-2 rounded-full border border-line bg-lumen-deep/60 px-3.5 py-2 text-xs font-medium text-fathom sm:flex"
        >
          <History className="size-3.5" />
          Transaction history
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-fathom p-6 text-lumen shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-lumen/10" />
        <div className="pointer-events-none absolute -right-8 -top-8 size-48 rounded-full border border-lumen/10" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-mono text-[0.56rem] text-lumen/50">Available balance</span>
            <button
              type="button"
              onClick={() => setShowBalance((value) => !value)}
              aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              className="flex size-6 items-center justify-center rounded-full text-lumen/50 transition-colors hover:bg-lumen/10 hover:text-lumen"
            >
              {showBalance ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>

          <p className="mt-3 font-display text-[clamp(2.8rem,9vw,4.5rem)] font-semibold leading-none tracking-[-0.055em]">
            {showBalance ? formatNaira(availableBalance) : '₦••••••'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-lumen/55">
            <span>{state.owner.bank}</span>
            <span className="text-lumen/25">·</span>
            <button
              type="button"
              onClick={copyAccountNumber}
              className="flex items-center gap-1.5 font-mono transition-colors hover:text-lumen"
            >
              {state.owner.accountNumber}
              {copied ? (
                <Check className="size-3.5 text-dawn" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
            <span className="sr-only" aria-live="polite">
              {copied ? 'Account number copied' : ''}
            </span>
          </div>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link
              to="/app/transfer"
              className="inline-flex items-center gap-2 rounded-full bg-lumen px-5 py-3 text-sm font-semibold text-fathom transition-colors hover:bg-dawn"
            >
              Send money
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              to="/app/activity"
              className="inline-flex items-center gap-2 rounded-full border border-lumen/20 px-5 py-3 text-sm font-semibold text-lumen/85 transition-colors hover:bg-lumen/10"
            >
              View history
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-3xl border border-line bg-lumen p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label-mono text-[0.55rem] text-muted">This month</p>
              <h2 className="mt-1.5 font-display text-2xl font-semibold">Spending</h2>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-dawn text-fathom-deep">
              <TrendingDown className="size-4" />
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl font-semibold tracking-[-0.04em]">
                {formatNaira(monthlySpending)}
              </p>
              <p className="mt-1 text-xs text-muted">
                of {formatNaira(state.monthlyBudget)} monthly budget
              </p>
            </div>
            <span className="rounded-full bg-lumen-deep px-3 py-1.5 font-mono text-[0.62rem] text-fathom">
              {spendingPercentage}%
            </span>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-lumen-dark">
            <div
              className="h-full rounded-full bg-fathom transition-all duration-500"
              style={{ width: `${spendingPercentage}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs">
            <span className="text-muted">
              {formatNaira(remainingBudget)} left this month
            </span>
            <Link
              to="/app/activity"
              className="flex items-center gap-1 font-medium text-fathom hover:underline"
            >
              Review spending
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-lumen-deep/55 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="label-mono text-[0.55rem] text-muted">Income</p>
            <span className="flex size-9 items-center justify-center rounded-full bg-success-soft text-success">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <p className="mt-6 font-display text-4xl font-semibold tracking-[-0.04em]">
            {formatNaira(monthlyIncome)}
          </p>
          <p className="mt-1 text-xs text-muted">Received this month</p>
          <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs">
            <span className="text-muted">Net position</span>
            <span className="font-mono font-semibold text-success">
              +{formatNaira(Math.max(monthlyIncome - monthlySpending, 0))}
            </span>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
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
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-lumen-deep/55 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="label-mono text-[0.55rem] text-muted">Saved</p>
              <h2 className="mt-1.5 font-display text-2xl font-semibold">Quick send</h2>
            </div>
            <Link
              to="/app/transfer"
              className="text-[0.65rem] font-medium text-fathom hover:underline"
            >
              All recipients
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {favorites.map((beneficiary) => (
              <Link
                key={beneficiary.id}
                to={`/app/transfer?to=${beneficiary.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-lumen p-3 transition-colors hover:border-fathom/30"
              >
                <span className="flex size-10 items-center justify-center rounded-full bg-dawn font-display text-sm font-semibold text-fathom-deep">
                  {beneficiary.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{beneficiary.name}</span>
                  <span className="block text-[0.65rem] text-muted">{beneficiary.bank}</span>
                </span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ))}
          </div>

          <Link
            to="/app/transfer"
            className="mt-4 flex items-center justify-between rounded-2xl bg-fathom px-4 py-3 text-sm font-semibold text-lumen transition-colors hover:bg-fathom-deep"
          >
            New transfer
            <ArrowUpRight className="size-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}
