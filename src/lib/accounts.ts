import type { Owner } from './types'
import { initialsOf } from './utils'

export interface AccountProfile {
  id: string
  email: string
  owner: Owner
  createdAt: string
}

export const ACCOUNTS_KEY = 'quanto-accounts-v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAccountProfile(value: unknown): value is AccountProfile {
  if (!isRecord(value) || !isRecord(value.owner)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.owner.name === 'string' &&
    typeof value.owner.firstName === 'string' &&
    typeof value.owner.accountNumber === 'string' &&
    typeof value.owner.bank === 'string' &&
    typeof value.owner.initials === 'string'
  )
}

export function listAccounts(): AccountProfile[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isAccountProfile)
  } catch {
    return []
  }
}

function saveAccounts(accounts: AccountProfile[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function findAccount(accountId: string) {
  return listAccounts().find((account) => account.id === accountId) ?? null
}

export function findAccountByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  return (
    listAccounts().find((account) => account.email === normalized) ?? null
  )
}

function nextAccountNumber(accounts: AccountProfile[]) {
  const used = new Set(accounts.map((account) => account.owner.accountNumber))

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const digits = crypto.getRandomValues(new Uint8Array(10))
    const accountNumber = [...digits]
      .map((value) => String(value % 10))
      .join('')
    if (!used.has(accountNumber)) return accountNumber
  }

  return `${Date.now()}`.slice(-10).padStart(10, '0')
}

export function createAccountProfile(input: {
  name: string
  email: string
}): AccountProfile {
  const name = input.name.trim().replace(/\s+/g, ' ')
  const accounts = listAccounts()
  const owner: Owner = {
    name,
    firstName: name.split(' ')[0] || name,
    accountNumber: nextAccountNumber(accounts),
    bank: 'Quanto',
    initials: initialsOf(name),
  }

  const profile: AccountProfile = {
    id: `acct_${crypto.randomUUID()}`,
    email: input.email.trim().toLowerCase(),
    owner,
    createdAt: new Date().toISOString(),
  }

  saveAccounts([profile, ...accounts])
  return profile
}
