import { House, LockKeyhole, ReceiptText, Settings2 } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from './Logo'
import { useBankingStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/activity', label: 'Activity', icon: ReceiptText },
  { to: '/app/settings', label: 'Settings', icon: Settings2 },
]

interface AppShellProps {
  onLock: () => void
}

export function AppShell({ onLock }: AppShellProps) {
  const owner = useBankingStore((state) => state.owner)

  return (
    <div className="min-h-screen bg-lumen text-vast">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-lumen-deep/70 px-5 py-7 lg:flex">
        <Logo />

        <nav className="mt-12 space-y-1.5" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-fathom text-lumen shadow-sm'
                    : 'text-muted hover:bg-lumen-dark/60 hover:text-vast',
                )
              }
            >
              <Icon className="size-[18px]" strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-line bg-lumen p-4">
          <p className="label-mono text-[0.56rem] text-fathom">Demo banking</p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Accounts and transfers are simulated locally in this build.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-lumen/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Logo compact className="lg:hidden" />
            <div className="hidden items-center gap-2 lg:flex">
              <span className="label-mono text-[0.58rem] text-muted">Personal account</span>
              <span className="text-line">/</span>
              <span className="text-sm font-medium">{owner.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onLock}
                aria-label="Lock app"
                title="Lock app"
                className="flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-lumen-deep hover:text-vast"
              >
                <LockKeyhole className="size-4" />
              </button>
              <span className="hidden items-center gap-2 rounded-full border border-line bg-lumen-deep px-3 py-1.5 text-[0.7rem] font-medium text-fathom sm:flex">
                <span className="size-1.5 rounded-full bg-success" />
                Demo account
              </span>
              <span className="flex size-9 items-center justify-center rounded-full bg-dawn font-display text-lg font-semibold text-fathom-deep">
                {owner.initials.slice(0, 1)}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-lumen/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-3 text-[0.64rem] font-medium transition-colors',
                  isActive ? 'text-fathom' : 'text-muted',
                )
              }
            >
              <Icon className="size-5" strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
