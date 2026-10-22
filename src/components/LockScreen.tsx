import { useEffect, useState, type FormEvent } from 'react'
import {
  ChevronDown,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { Logo } from './Logo'
import { PinInput } from './PinInput'
import { listAccounts, type AccountProfile } from '@/lib/accounts'
import { activateAccount, signUp } from '@/lib/session'
import { getActiveAccountId, useBankingStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface LockScreenProps {
  onUnlock: () => void
}

type Mode = 'unlock' | 'signup'

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [accounts, setAccounts] = useState<AccountProfile[]>(() => listAccounts())
  const [selectedId, setSelectedId] = useState<string | null>(
    () => getActiveAccountId() ?? listAccounts()[0]?.id ?? null,
  )
  const [mode, setMode] = useState<Mode>(() =>
    listAccounts().length > 0 ? 'unlock' : 'signup',
  )
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [loadedAccountId, setLoadedAccountId] = useState<string | null>(
    () => getActiveAccountId(),
  )
  const [busy, setBusy] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [newPin, setNewPin] = useState('')
  const [signingUp, setSigningUp] = useState(false)

  const unlockWithPin = useBankingStore((state) => state.unlockWithPin)
  const selected =
    accounts.find((account) => account.id === selectedId) ?? null
  const switching = Boolean(selectedId) && selectedId !== loadedAccountId

  useEffect(() => {
    if (!selectedId || selectedId === loadedAccountId) return

    let cancelled = false

    activateAccount(selectedId)
      .then(() => {
        if (!cancelled) {
          setLoadedAccountId(selectedId)
          setResetKey((key) => key + 1)
          setError(null)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not switch accounts.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [loadedAccountId, selectedId])

  const handleUnlock = async (value: string) => {
    if (!selected) {
      setPinError('Choose an account first.')
      return
    }

    setBusy(true)
    setPinError(null)
    await new Promise((resolve) => setTimeout(resolve, 320))
    const result = unlockWithPin(value)

    if (!result) {
      setBusy(false)
      setPinError('That PIN is not correct. Try again.')
      setResetKey((key) => key + 1)
      return
    }

    onUnlock()
  }

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSigningUp(true)

    try {
      const profile = await signUp({ name, email, pin: newPin })
      setAccounts(listAccounts())
      setLoadedAccountId(profile.id)
      setSelectedId(profile.id)
      setMode('unlock')
      onUnlock()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not create your account.',
      )
      setSigningUp(false)
    }
  }

  const chooseAccount = (accountId: string) => {
    setSelectedId(accountId)
    setMode('unlock')
    setSwitcherOpen(false)
    setPinError(null)
    setError(null)
    setResetKey((key) => key + 1)
  }

  const showSignUp = () => {
    setMode('signup')
    setSwitcherOpen(false)
    setPinError(null)
    setError(null)
  }

  const showUnlock = () => {
    setMode('unlock')
    setError(null)
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-lumen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-lumen-deep" />
      <div className="pointer-events-none absolute -right-28 top-12 size-80 rounded-full border border-fathom/10" />
      <div className="pointer-events-none absolute -right-10 top-32 size-52 rounded-full border border-fathom/10" />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-7 sm:px-6">
        <Logo />
        <span className="flex items-center gap-2 rounded-full border border-line bg-lumen px-3 py-1.5 text-[0.65rem] font-medium text-fathom">
          <ShieldCheck className="size-3.5" />
          Secure access
        </span>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16 pt-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="animate-fade-up rounded-[2rem] border border-line bg-lumen p-6 shadow-card sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-full bg-fathom-soft text-fathom">
              {mode === 'signup' ? (
                <UserPlus className="size-5" />
              ) : (
                <LockKeyhole className="size-5" />
              )}
            </span>

            {mode === 'signup' ? (
              <>
                <p className="label-mono mt-6 text-[0.58rem] text-muted">
                  New to Quanto
                </p>
                <h1 className="display mt-2 text-3xl sm:text-5xl">
                  Open your account
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Create a local demo account to try transfers, duress access, and
                  silent failure on this device.
                </p>

                <form className="mt-7 space-y-4" onSubmit={handleSignUp}>
                  <label className="block">
                    <span className="text-[0.68rem] font-medium text-muted">
                      Full name
                    </span>
                    <input
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value.slice(0, 60))
                        setError(null)
                      }}
                      autoComplete="name"
                      className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 text-sm outline-none transition-colors focus:border-fathom"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[0.68rem] font-medium text-muted">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value.slice(0, 120))
                        setError(null)
                      }}
                      autoComplete="email"
                      className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 text-sm outline-none transition-colors focus:border-fathom"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[0.68rem] font-medium text-muted">
                      Create a 4-digit PIN
                    </span>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      maxLength={4}
                      value={newPin}
                      onChange={(event) => {
                        setNewPin(
                          event.target.value.replace(/\D/g, '').slice(0, 4),
                        )
                        setError(null)
                      }}
                      className="mt-2 w-full rounded-2xl border border-line bg-lumen-deep/40 px-4 py-3 text-center font-mono text-lg tracking-[0.35em] outline-none transition-colors focus:border-fathom"
                    />
                  </label>

                  {error && (
                    <p className="text-xs font-medium text-danger" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={signingUp}
                    className="btn-primary w-full justify-center py-3.5 text-sm disabled:opacity-50"
                  >
                    {signingUp ? 'Creating account…' : 'Create account'}
                  </button>
                </form>

                <div className="mt-5 border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={showUnlock}
                    className="btn-secondary w-full justify-center py-3.5 text-sm"
                  >
                    <LogIn className="size-4" />
                    Sign in
                  </button>
                  <p className="mt-2 text-center text-[0.65rem] text-muted">
                    Already have an account? Sign in with your PIN.
                  </p>
                </div>
              </>
            ) : accounts.length === 0 ? (
              <>
                <p className="label-mono mt-6 text-[0.58rem] text-muted">
                  Sign in
                </p>
                <h1 className="display mt-2 text-3xl sm:text-5xl">
                  No account yet
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  There is no Quanto account saved in this browser yet. Create one to
                  get started.
                </p>
                <button
                  type="button"
                  onClick={showSignUp}
                  className="btn-primary mt-7 w-full justify-center py-3.5 text-sm"
                >
                  <UserPlus className="size-4" />
                  Create an account
                </button>
              </>
            ) : (
              <>
                <p className="label-mono mt-6 text-[0.58rem] text-muted">
                  Welcome back
                </p>
                <h1 className="display mt-2 text-3xl sm:text-5xl">
                  Unlock your account
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Enter your 4-digit PIN to continue to your Quanto account.
                </p>

                {selected && (
                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-lumen-deep/40 p-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-dawn font-display text-sm font-semibold text-fathom-deep">
                      {selected.owner.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {selected.owner.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[0.65rem] text-muted">
                        {selected.owner.accountNumber}
                      </p>
                    </div>
                    {accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSwitcherOpen((value) => !value)}
                        className="flex items-center gap-1 rounded-full border border-line bg-lumen px-2.5 py-1.5 text-[0.6rem] font-medium text-fathom"
                        aria-expanded={switcherOpen}
                      >
                        Switch
                        <ChevronDown
                          className={cn(
                            'size-3 transition-transform',
                            switcherOpen && 'rotate-180',
                          )}
                        />
                      </button>
                    )}
                  </div>
                )}

                {switcherOpen && (
                  <div className="mt-2 space-y-1.5">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => chooseAccount(account.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                          account.id === selectedId
                            ? 'border-fathom bg-fathom-soft/50'
                            : 'border-line bg-lumen hover:bg-lumen-deep/40',
                        )}
                      >
                        <span className="flex size-8 items-center justify-center rounded-full bg-dawn font-display text-[0.65rem] font-semibold text-fathom-deep">
                          {account.owner.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">
                            {account.owner.name}
                          </span>
                          <span className="block font-mono text-[0.6rem] text-muted">
                            {account.owner.accountNumber}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-7">
                  <PinInput
                    key={resetKey}
                    disabled={busy || switching || !selected || Boolean(error)}
                    error={pinError}
                    onSubmit={handleUnlock}
                  />
                </div>

                {error && (
                  <p
                    className="mt-3 text-center text-xs font-medium text-danger"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-center gap-1.5 text-[0.65rem] text-muted">
                  <LockKeyhole className="size-3.5" />
                  {switching
                    ? 'Loading account…'
                    : busy
                      ? 'Unlocking…'
                      : 'Your session is locked when this page reloads.'}
                </div>

                <button
                  type="button"
                  onClick={showSignUp}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 border-t border-line pt-4 text-xs font-medium text-fathom hover:underline"
                >
                  <UserPlus className="size-3.5" />
                  Create another account
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
