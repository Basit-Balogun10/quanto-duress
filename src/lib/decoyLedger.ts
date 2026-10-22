import { validateDuressLedger } from './duressLedger'
import type { Transaction } from './types'

const CACHE_KEY = 'quanto-decoy-ledger-v1'
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000
const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000
const REQUEST_TIMEOUT_MS = 8_000

interface CachedDecoyLedger {
  balance: number
  monthlyBudget: number
  ledger: Transaction[]
  model: string | null
  generatedAt: string | null
  cachedAt: string
}

const inflight = new Map<string, Promise<Transaction[] | null>>()

function decoyApiUrl() {
  const configured = import.meta.env.VITE_DECOY_API_URL
  if (typeof configured !== 'string') return null
  const trimmed = configured.trim().replace(/\/+$/, '')
  return trimmed.length > 0 ? trimmed : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCache(): CachedDecoyLedger | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || !Array.isArray(parsed.ledger)) return null
    if (
      typeof parsed.balance !== 'number' ||
      typeof parsed.monthlyBudget !== 'number' ||
      typeof parsed.cachedAt !== 'string'
    ) {
      return null
    }

    return {
      balance: parsed.balance,
      monthlyBudget: parsed.monthlyBudget,
      ledger: parsed.ledger as Transaction[],
      model: typeof parsed.model === 'string' ? parsed.model : null,
      generatedAt:
        typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      cachedAt: parsed.cachedAt,
    }
  } catch {
    return null
  }
}

function writeCache(value: CachedDecoyLedger) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    return
  }
}

function cacheAge(cachedAt: string) {
  const timestamp = Date.parse(cachedAt)
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY
  return Date.now() - timestamp
}

function matchesRequest(
  cached: CachedDecoyLedger,
  balance: number,
  monthlyBudget: number,
) {
  return cached.balance === balance && cached.monthlyBudget === monthlyBudget
}

function isValidForRequest(
  cached: CachedDecoyLedger,
  balance: number,
  monthlyBudget: number,
) {
  if (!matchesRequest(cached, balance, monthlyBudget)) return false
  if (cacheAge(cached.cachedAt) > MAX_CACHE_AGE_MS) return false

  try {
    validateDuressLedger(cached.ledger, balance)
    return true
  } catch {
    return false
  }
}

export function getCachedDuressLedger(
  balance: number,
  monthlyBudget: number,
): Transaction[] | null {
  const cached = readCache()
  if (!cached || !isValidForRequest(cached, balance, monthlyBudget)) return null
  return validateDuressLedger(cached.ledger, balance)
}

export function clearDuressDecoyCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    return
  }
}

export async function fetchDuressDecoy(
  balance: number,
  monthlyBudget: number,
): Promise<Transaction[]> {
  const baseUrl = decoyApiUrl()
  if (!baseUrl) throw new Error('Decoy API is not configured.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/api/duress/ledger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balance, monthlyBudget }),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Decoy API returned ${response.status}.`)
    }

    const data: unknown = await response.json()
    if (!isRecord(data) || !Array.isArray(data.ledger)) {
      throw new Error('Decoy API returned an invalid response.')
    }

    return validateDuressLedger(data.ledger, balance)
  } finally {
    clearTimeout(timeout)
  }
}

export async function primeDuressDecoy(
  balance: number,
  monthlyBudget: number,
): Promise<Transaction[] | null> {
  if (!decoyApiUrl()) return null

  const cached = readCache()
  if (
    cached &&
    isValidForRequest(cached, balance, monthlyBudget) &&
    cacheAge(cached.cachedAt) <= REFRESH_AFTER_MS
  ) {
    return validateDuressLedger(cached.ledger, balance)
  }

  const key = `${balance}:${monthlyBudget}`
  const existing = inflight.get(key)
  if (existing) return existing

  const task = fetchDuressDecoy(balance, monthlyBudget)
    .then((ledger) => {
      writeCache({
        balance,
        monthlyBudget,
        ledger,
        model: null,
        generatedAt: null,
        cachedAt: new Date().toISOString(),
      })
      return ledger
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, task)
  return task
}
