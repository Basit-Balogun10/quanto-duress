import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listAccounts } from '../../src/lib/accounts'
import { activateAccount, signUp } from '../../src/lib/session'
import {
  forgetActiveAccountId,
  useBankingStore,
} from '../../src/lib/store'

beforeEach(() => {
  localStorage.clear()
  forgetActiveAccountId()
})

afterEach(() => {
  localStorage.clear()
  forgetActiveAccountId()
})

describe('multi-account onboarding', () => {
  it('creates an account, signs in, and starts with no fixture data', async () => {
    const profile = await signUp({
      name: 'Ada Okafor',
      email: 'Ada@Example.com',
      pin: '1234',
    })
    const state = useBankingStore.getState()

    expect(profile.owner.name).toBe('Ada Okafor')
    expect(profile.owner.firstName).toBe('Ada')
    expect(profile.owner.accountNumber).toMatch(/^\d{10}$/)
    expect(profile.email).toBe('ada@example.com')
    expect(listAccounts()).toHaveLength(1)
    expect(state.balance).toBe(0)
    expect(state.transactions).toEqual([])
    expect(state.beneficiaries).toEqual([])
    expect(state.pin).toBe('1234')
  })

  it('rejects duplicate emails on the same browser', async () => {
    await signUp({ name: 'Ada Okafor', email: 'ada@example.com', pin: '1234' })

    await expect(
      signUp({ name: 'Another Ada', email: 'ADA@example.com', pin: '5678' }),
    ).rejects.toThrow(/already exists/)
    expect(listAccounts()).toHaveLength(1)
  })

  it('keeps balances and PINs isolated between accounts', async () => {
    const ada = await signUp({
      name: 'Ada Okafor',
      email: 'ada@example.com',
      pin: '1234',
    })
    useBankingStore.getState().fundAccount(25_000)

    const tunde = await signUp({
      name: 'Tunde Bello',
      email: 'tunde@example.com',
      pin: '5678',
    })
    useBankingStore.getState().fundAccount(7_500)

    await activateAccount(ada.id)
    expect(useBankingStore.getState().balance).toBe(25_000)
    expect(useBankingStore.getState().unlockWithPin('1234')).toBe('normal')
    expect(useBankingStore.getState().unlockWithPin('5678')).toBeNull()

    await activateAccount(tunde.id)
    expect(useBankingStore.getState().balance).toBe(7_500)
    expect(useBankingStore.getState().unlockWithPin('5678')).toBe('normal')
    expect(useBankingStore.getState().unlockWithPin('1234')).toBeNull()
  })

  it('records mock funding as a completed incoming transaction', async () => {
    await signUp({ name: 'Ada Okafor', email: 'ada@example.com', pin: '1234' })
    useBankingStore.getState().fundAccount(50_000)

    const state = useBankingStore.getState()
    expect(state.balance).toBe(50_000)
    expect(state.transactions).toHaveLength(1)
    expect(state.transactions[0]?.direction).toBe('in')
    expect(state.transactions[0]?.amount).toBe(50_000)
    expect(state.transactions[0]?.status).toBe('completed')
  })
})
