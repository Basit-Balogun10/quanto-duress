import {
  createAccountProfile,
  findAccount,
  findAccountByEmail,
  type AccountProfile,
} from './accounts'
import {
  createInitialState,
  forgetActiveAccountId,
  getActiveAccountId,
  rememberActiveAccountId,
  rehydrateActiveAccount,
  setActiveAccountStateId,
  useBankingStore,
} from './store'

export interface SignUpInput {
  name: string
  email: string
  pin: string
}

function normalizedSignUp(input: SignUpInput) {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const email = input.email.trim().toLowerCase()

  if (name.length < 2) {
    throw new Error('Enter your full name.')
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.')
  }
  if (!/^\d{4}$/.test(input.pin)) {
    throw new Error('Your PIN must be exactly 4 digits.')
  }
  if (findAccountByEmail(email)) {
    throw new Error('An account with that email already exists on this device.')
  }

  return { name, email, pin: input.pin }
}

export async function signUp(input: SignUpInput): Promise<AccountProfile> {
  const normalized = normalizedSignUp(input)
  const profile = createAccountProfile({
    name: normalized.name,
    email: normalized.email,
  })

  setActiveAccountStateId(profile.id)
  await rehydrateActiveAccount()
  useBankingStore.setState(createInitialState(profile.owner, normalized.pin))
  rememberActiveAccountId(profile.id)

  return profile
}

export async function activateAccount(accountId: string): Promise<AccountProfile> {
  const profile = findAccount(accountId)
  if (!profile) {
    throw new Error('That account no longer exists on this device.')
  }

  const previousAccountId = getActiveAccountId()
  setActiveAccountStateId(accountId)
  await rehydrateActiveAccount()

  if (useBankingStore.getState().owner.accountNumber !== profile.owner.accountNumber) {
    setActiveAccountStateId(previousAccountId)
    await rehydrateActiveAccount()
    throw new Error('Could not load that account. Try signing in again.')
  }

  rememberActiveAccountId(accountId)
  return profile
}

export function lockApp() {
  window.location.assign('/app')
}

export function switchAccount() {
  forgetActiveAccountId()
  window.location.assign('/app')
}
