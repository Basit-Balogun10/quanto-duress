import { useEffect, useState } from 'react'
import {
  House,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings2,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Logo } from './Logo'
import { primeDuressDecoy } from '@/lib/decoyLedger'
import { duressBalanceFor, useBankingStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/activity', label: 'Activity', icon: ReceiptText },
  { to: '/app/settings', label: 'Settings', icon: Settings2 },
]

const SIDEBAR_KEY = 'quanto-sidebar-collapsed'

export function AppShell() {
  const owner = useBankingStore((state) => state.owner)
  const balance = useBankingStore((state) => state.balance)
  const monthlyBudget = useBankingStore((state) => state.monthlyBudget)
  const duress = useBankingStore((state) => state.duress)
  const duressActive = useBankingStore((state) => state.duressActive)
  const silentFailureActive = useBankingStore((state) => state.silentFailureActive)
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === 'true',
  )

  useEffect(() => {
    if (
      !duress ||
      duress.historyMode !== 'decoy' ||
      duressActive ||
      silentFailureActive
    ) {
      return
    }

    void primeDuressDecoy(duressBalanceFor(balance, duress), monthlyBudget)
  }, [balance, monthlyBudget, duress, duressActive, silentFailureActive])

  const toggleSidebar = () => {
    setCollapsed((value) => {
      const next = !value
      localStorage.setItem(SIDEBAR_KEY, String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-lumen text-vast">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-lumen-deep/70 py-7 transition-[width,padding] duration-200 lg:flex',
          collapsed ? 'w-20 px-3' : 'w-64 px-5',
        )}
      >
        <div
          className={cn(
            'flex',
            collapsed ? 'flex-col items-center gap-4' : 'items-center justify-between',
          )}
        >
          <Logo compact={collapsed} />
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-lumen hover:text-vast"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        <nav className={cn('space-y-1.5', collapsed ? 'mt-8' : 'mt-12')} aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-2xl text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3',
                  isActive
                    ? 'bg-fathom text-lumen shadow-sm'
                    : 'text-muted hover:bg-lumen-dark/60 hover:text-vast',
                )
              }
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className="mt-auto rounded-3xl border border-line bg-lumen p-4">
            <p className="label-mono text-[0.56rem] text-fathom">Security</p>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Your session locks when the app is closed. Keep your PIN private.
            </p>
          </div>
        )}
      </aside>

      <div
        className={cn(
          'transition-[padding] duration-200',
          collapsed ? 'lg:pl-20' : 'lg:pl-64',
        )}
      >
        <header className="sticky top-0 z-30 border-b border-line bg-lumen/90 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
            <Logo compact className="lg:hidden" />
            <div className="hidden items-center gap-2 lg:flex">
              <span className="label-mono text-[0.58rem] text-muted">Personal account</span>
              <span className="text-line">/</span>
              <span className="text-sm font-medium">{owner.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-line bg-lumen-deep px-3 py-1.5 text-[0.68rem] font-medium text-fathom">
                <span className="size-1.5 rounded-full bg-success" />
                Account active
              </span>
              <span className="flex size-9 items-center justify-center rounded-full bg-dawn font-display text-lg font-semibold text-fathom-deep">
                {owner.initials.slice(0, 1)}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-24 pt-5 sm:px-6 sm:pt-8 lg:pb-12">
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
                  'flex flex-col items-center gap-0.5 py-2.5 text-[0.62rem] font-medium transition-colors',
                  isActive ? 'text-fathom' : 'text-muted',
                )
              }
            >
              <Icon className="size-4.5" strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
