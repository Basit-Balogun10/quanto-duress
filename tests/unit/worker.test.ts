import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import worker from '../../worker/src/index'
import type { Transaction } from '../../src/lib/types'

const ORIGIN = 'http://localhost:5173'
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
const AMOUNTS = [3_000, 2_500, 3_500, 2_000, 4_000, 3_000, 2_500, 3_500, 3_500]

interface DecoyResponse {
  ledger: Transaction[]
  source: 'ai' | 'cache'
  model: string
  generatedAt: string
  error?: string
}

let serial = 0

function outgoingTransactions(amounts = AMOUNTS): Transaction[] {
  return amounts.map((amount, index) => {
    serial += 1
    return {
      id: `ai_decoy_${serial}`,
      direction: 'out',
      amount,
      counterparty: `Test Merchant ${serial}`,
      bank: 'GTBank',
      accountNumber: '0123456789',
      description: `Test purchase ${serial}`,
      category: 'shopping',
      createdAt: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
      status: 'completed',
      reference: `QX-TEST${serial}`,
    }
  })
}

function aiResponse(transactions = outgoingTransactions()) {
  return { response: JSON.stringify({ transactions }) }
}

function openAiResponse(transactions = outgoingTransactions()) {
  return {
    choices: [{ message: { content: JSON.stringify({ transactions }) } }],
  }
}

function externalEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    ...environment({ AI: undefined }),
    AI_API_KEY: 'test-openai-key',
    AI_BASE_URL: 'https://api.openai.test/v1',
    AI_MODEL: 'gpt-5.4-mini',
    AI_REASONING_EFFORT: 'high',
    ...overrides,
  }
}

function request(body: unknown, init: RequestInit = {}) {
  return new Request('https://worker.test/api/duress/ledger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify(body),
    ...init,
  })
}

function environment(overrides: Record<string, unknown> = {}) {
  return {
    AI: { run: vi.fn().mockResolvedValue(aiResponse()) },
    AI_MODEL: MODEL,
    ALLOWED_ORIGINS: ORIGIN,
    ...overrides,
  }
}

class FakeD1 {
  readonly rows = new Map<string, Record<string, unknown>>()

  prepare(query: string) {
    return {
      bind: (...values: unknown[]) => ({
        first: async () => {
          if (!query.includes('SELECT')) return null
          const [cacheKey, now] = values
          const row = this.rows.get(String(cacheKey))
          if (!row || String(row.expires_at) <= String(now)) return null
          return row
        },
        run: async () => {
          if (query.includes('INSERT')) {
            const [cacheKey, payload, model, generatedAt, expiresAt] = values
            this.rows.set(String(cacheKey), {
              payload,
              model,
              generated_at: generatedAt,
              expires_at: expiresAt,
            })
          }
          return { success: true }
        },
      }),
    }
  }
}

function netTotal(transactions: Transaction[]) {
  return transactions.reduce(
    (total, transaction) =>
      total + (transaction.direction === 'in' ? transaction.amount : -transaction.amount),
    0,
  )
}

beforeEach(() => {
  serial = 0
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('decoy worker', () => {
  it('generates and validates a balanced AI ledger', async () => {
    const env = environment()
    const response = await worker.fetch(request({ balance: 50_000, monthlyBudget: 300_000 }), env)
    const data = (await response.json()) as DecoyResponse

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(data.source).toBe('ai')
    expect(data.model).toBe(MODEL)
    expect(data.ledger).toHaveLength(10)
    expect(netTotal(data.ledger)).toBe(50_000)
    expect(data.ledger.find((transaction) => transaction.direction === 'in')?.amount).toBe(
      77_500,
    )
    expect(env.AI.run).toHaveBeenCalledTimes(1)
  })

  it('reuses a cached ledger without calling AI again', async () => {
    const db = new FakeD1()
    const env = environment({ DB: db })
    const body = { balance: 50_000, monthlyBudget: 300_000 }

    const first = (await (
      await worker.fetch(request(body), env)
    ).json()) as DecoyResponse
    const second = (await (
      await worker.fetch(request(body), env)
    ).json()) as DecoyResponse

    expect(first.source).toBe('ai')
    expect(second.source).toBe('cache')
    expect(second.ledger).toEqual(first.ledger)
    expect(env.AI.run).toHaveBeenCalledTimes(1)
    expect(db.rows.size).toBe(1)
  })

  it('rejects AI output that is not valid JSON', async () => {
    const env = environment({
      AI: { run: vi.fn().mockResolvedValue({ response: 'not json' }) },
    })
    const response = await worker.fetch(request({ balance: 50_000, monthlyBudget: 300_000 }), env)

    expect(response.status).toBe(502)
  })

  it('anchors the balance when AI amounts drift', async () => {
    const transactions = outgoingTransactions().map((transaction) => ({
      ...transaction,
      amount: transaction.amount + 1,
    }))
    const env = environment({
      AI: { run: vi.fn().mockResolvedValue(aiResponse(transactions)) },
    })
    const response = await worker.fetch(request({ balance: 50_000, monthlyBudget: 300_000 }), env)

    expect(response.status).toBe(200)
    const data = (await response.json()) as DecoyResponse
    expect(netTotal(data.ledger)).toBe(50_000)
    expect(data.ledger.find((transaction) => transaction.direction === 'in')?.amount).toBe(
      77_509,
    )
  })

  it('rejects an implausible AI spend total', async () => {
    const transactions = outgoingTransactions(Array.from({ length: 9 }, () => 1_000))
    const env = environment({
      AI: { run: vi.fn().mockResolvedValue(aiResponse(transactions)) },
    })
    const response = await worker.fetch(request({ balance: 50_000, monthlyBudget: 300_000 }), env)

    expect(response.status).toBe(502)
  })

  it('uses an OpenAI-compatible provider with high reasoning', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(openAiResponse()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const env = externalEnvironment()
    const response = await worker.fetch(
      request({ balance: 50_000, monthlyBudget: 300_000 }),
      env,
    )
    const data = (await response.json()) as DecoyResponse

    expect(response.status).toBe(200)
    expect(data.source).toBe('ai')
    expect(data.model).toBe('gpt-5.4-mini')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.test/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )

    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    ) as Record<string, unknown>
    expect(body.model).toBe('gpt-5.4-mini')
    expect(body.reasoning_effort).toBe('high')
    expect(body.max_completion_tokens).toBe(8_192)
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(Array.isArray(body.messages)).toBe(true)
  })

  it('falls back to Workers AI when the external provider fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('provider unavailable', { status: 503 })),
    )
    const env = environment({
      AI_API_KEY: 'test-openai-key',
      AI_BASE_URL: 'https://api.openai.test/v1',
      AI_MODEL: 'gpt-5.4-mini',
      AI_REASONING_EFFORT: 'high',
    })

    const response = await worker.fetch(
      request({ balance: 50_000, monthlyBudget: 300_000 }),
      env,
    )
    const data = (await response.json()) as DecoyResponse

    expect(response.status).toBe(200)
    expect(data.model).toBe(MODEL)
    expect(env.AI.run).toHaveBeenCalledTimes(1)
  })

  it('returns a safe error when AI fails or is missing', async () => {
    const failed = environment({
      AI: { run: vi.fn().mockRejectedValue(new Error('model offline')) },
    })
    expect(
      (
        await worker.fetch(
          request({ balance: 50_000, monthlyBudget: 300_000 }),
          failed,
        )
      ).status,
    ).toBe(502)

    const missing = environment({ AI: undefined })
    expect(
      (
        await worker.fetch(
          request({ balance: 50_000, monthlyBudget: 300_000 }),
          missing,
        )
      ).status,
    ).toBe(503)
  })

  it('rejects disallowed origins', async () => {
    const env = environment()
    const response = await worker.fetch(
      request({ balance: 50_000, monthlyBudget: 300_000 }, { headers: { Origin: 'https://evil.test' } }),
      env,
    )

    expect(response.status).toBe(403)
    expect(env.AI.run).not.toHaveBeenCalled()
  })

  it('validates the request body and method', async () => {
    const env = environment()

    const invalid = await worker.fetch(
      request({ balance: -1, monthlyBudget: 300_000 }),
      env,
    )
    expect(invalid.status).toBe(400)

    const wrongType = await worker.fetch(
      request({ balance: 50_000, monthlyBudget: 300_000 }, {
        headers: { 'Content-Type': 'text/plain', Origin: ORIGIN },
      }),
      env,
    )
    expect(wrongType.status).toBe(415)

    const wrongMethod = await worker.fetch(
      new Request('https://worker.test/api/duress/ledger', {
        method: 'GET',
        headers: { Origin: ORIGIN },
      }),
      env,
    )
    expect(wrongMethod.status).toBe(405)
  })

  it('reports health without exposing configuration secrets', async () => {
    const env = environment({ DB: new FakeD1() })
    const response = await worker.fetch(
      new Request('https://worker.test/health', { headers: { Origin: ORIGIN } }),
      env,
    )
    const data = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(data).toEqual({ ok: true, ai: true, cache: true })
  })
})
