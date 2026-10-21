import {
  ArrowUpRight,
  House,
  ReceiptText,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from './Logo'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/send', label: 'Send', icon: ArrowUpRight },
  { to: '/app/activity', label: 'Activity', icon: ReceiptText },
  { to: '/app/safety', label: 'Safety', icon: ShieldCheck },
  { to: '/app/settings', label: 'Settings', icon: Settings2 },
]

export function AppShell() {
  return (
    <div className="min-h-screen bg-lumen text-vast">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-lumen-deep/70 px-5 py-7 lg:flex">
        <Logo to="/app" />

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
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            <span className="label-mono text-[0.58rem] text-success">Protection active</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Your duress PIN is armed. Holds are reviewed locally in this demo.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-lumen/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Logo compact to="/app" className="lg:hidden" />
            <div className="hidden items-center gap-2 lg:flex">
              <span className="label-mono text-[0.58rem] text-muted">Personal account</span>
              <span className="text-line">/</span>
              <span className="text-sm font-medium">Ada Okafor</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-line bg-lumen-deep px-3 py-1.5 text-[0.7rem] font-medium text-fathom sm:flex">
                <ShieldCheck className="size-3.5" />
                Demo protected
              </span>
              <span className="flex size-9 items-center justify-center rounded-full bg-dawn font-display text-lg font-semibold text-fathom-deep">
                A
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
        <div className="grid grid-cols-5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 py-3 text-[0.62rem] font-medium transition-colors',
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
