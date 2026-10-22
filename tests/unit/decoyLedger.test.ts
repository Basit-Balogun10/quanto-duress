import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDuressDecoyCache,
  fetchDuressDecoy,
  getCachedDuressLedger,
  primeDuressDecoy,
} from '../../src/lib/decoyLedger'
import { createDuressLedger, DuressLedgerValidationError } from '../../src/lib/duressLedger'
import { useBankingStore } from '../../src/lib/store'
import type { Transaction } from '../../src/lib/types'

const API_URL = 'https://decoy.test'

function markedLedger(balance = 50_000): Transaction[] {
  return createDuressLedger(balance, 300_000).map((transaction) => ({
    ...transaction,
    counterparty: `AI ${transaction.counterparty}`,
  }))
}

function mockFetch(ledger: Transaction[], status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ledger }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  vi.stubEnv('VITE_DECOY_API_URL', API_URL)
  useBankingStore.getState().resetDemo()
  clearDuressDecoyCache()
})

afterEach(() => {
  clearDuressDecoyCache()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchDuressDecoy', () => {
  it('requests a decoy and validates it against the target balance', async () => {
    const ledger = markedLedger()
    const fetchMock = mockFetch(ledger)

    await expect(fetchDuressDecoy(50_000, 300_000)).resolves.toEqual(ledger)
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/api/duress/ledger`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ balance: 50_000, monthlyBudget: 300_000 }),
        credentials: 'omit',
      }),
    )
  })

  it('rejects a response that does not match the target balance', async () => {
    mockFetch(markedLedger(50_000))

    await expect(fetchDuressDecoy(60_000, 300_000)).rejects.toBeInstanceOf(
      DuressLedgerValidationError,
    )
  })

  it('rejects non-success responses', async () => {
    mockFetch(markedLedger(), 502)

    await expect(fetchDuressDecoy(50_000, 300_000)).rejects.toThrow(/502/)
  })
})

describe('primeDuressDecoy', () => {
  it('caches a validated ledger and reuses it', async () => {
    const ledger = markedLedger()
    const fetchMock = mockFetch(ledger)

    await expect(primeDuressDecoy(50_000, 300_000)).resolves.toEqual(ledger)
    expect(getCachedDuressLedger(50_000, 300_000)).toEqual(ledger)

    await expect(primeDuressDecoy(50_000, 300_000)).resolves.toEqual(ledger)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null and leaves the cache empty when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await expect(primeDuressDecoy(50_000, 300_000)).resolves.toBeNull()
    expect(getCachedDuressLedger(50_000, 300_000)).toBeNull()
  })

  it('does nothing when no decoy API is configured', async () => {
    vi.stubEnv('VITE_DECOY_API_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(primeDuressDecoy(50_000, 300_000)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores a cached ledger for a different balance', async () => {
    mockFetch(markedLedger(50_000))
    await primeDuressDecoy(50_000, 300_000)

    expect(getCachedDuressLedger(60_000, 300_000)).toBeNull()
  })
})

describe('duress unlock with an AI decoy', () => {
  it('uses the cached AI ledger instead of the deterministic fallback', async () => {
    const ledger = markedLedger(50_000)
    mockFetch(ledger)
    await primeDuressDecoy(50_000, 300_000)

    const store = useBankingStore.getState()
    store.setDuressSettings({
      pin: '4321',
      mode: 'amount',
      value: 50_000,
      historyMode: 'decoy',
    })
    expect(store.unlockWithPin('4321')).toBe('duress')

    expect(useBankingStore.getState().duressTransactions).toEqual(ledger)
  })

  it('falls back to the deterministic ledger when no AI cache matches', () => {
    const store = useBankingStore.getState()
    store.setDuressSettings({
      pin: '4321',
      mode: 'amount',
      value: 50_000,
      historyMode: 'decoy',
    })
    expect(store.unlockWithPin('4321')).toBe('duress')

    const history = useBankingStore.getState().duressTransactions
    expect(history.length).toBeGreaterThanOrEqual(4)
    expect(history.some((transaction) => transaction.counterparty.startsWith('AI '))).toBe(
      false,
    )
  })
})
