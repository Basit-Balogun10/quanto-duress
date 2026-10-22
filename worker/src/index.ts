import type { Transaction } from '../../src/lib/types'
import { validateDuressLedger } from '../../src/lib/duressLedgerValidation'

const PROMPT_VERSION = 'v1'
const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_BODY_BYTES = 4_096
const MAX_MONEY = 1_000_000_000_000
const MIN_OUTGOING = 6
const MAX_OUTGOING = 16

interface Env {
  AI?: Ai
  DB?: D1Database
  AI_MODEL?: string
  ALLOWED_ORIGINS?: string
}

interface LedgerRequest {
  balance: number
  monthlyBudget: number
}

interface CachedLedger {
  payload: string
  model: string
  generated_at: string
}

class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function allowedOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin: string, env: Env) {
  return allowedOrigins(env).includes(origin)
}

function corsHeaders(origin: string | null, env: Env): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  }

  if (origin && isAllowedOrigin(origin, env)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

function jsonResponse(
  data: unknown,
  status: number,
  origin: string | null,
  env: Env,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(origin, env),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function readMoney(value: unknown, label: string) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_MONEY
  ) {
    throw new ApiError(400, `${label} must be a whole naira amount.`)
  }
  return value
}

function readPayload(value: unknown): LedgerRequest {
  if (!isRecord(value)) {
    throw new ApiError(400, 'Request body must be a JSON object.')
  }

  return {
    balance: readMoney(value.balance, 'balance'),
    monthlyBudget: readMoney(value.monthlyBudget, 'monthlyBudget'),
  }
}

async function readRequestBody(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(415, 'Content-Type must be application/json.')
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_BYTES) {
    throw new ApiError(413, 'Request body is too large.')
  }

  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) {
    throw new ApiError(413, 'Request body is too large.')
  }

  try {
    return readPayload(JSON.parse(text))
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(400, 'Request body must contain valid JSON.')
  }
}

function targetSpendFor(balance: number, monthlyBudget: number) {
  if (balance === 0) {
    return Math.min(28_000, Math.max(5_000, Math.round(monthlyBudget * 0.7)))
  }

  return Math.max(
    5_000,
    Math.min(Math.round(balance * 0.55), Math.round(monthlyBudget * 0.7)),
  )
}

function spendBoundsFor(balance: number, monthlyBudget: number) {
  const target = targetSpendFor(balance, monthlyBudget)
  return {
    target,
    lower: Math.max(1, Math.round(target * 0.5)),
    upper: Math.max(1, Math.round(target * 1.5)),
  }
}

function monthName() {
  return new Intl.DateTimeFormat('en-NG', { month: 'long' }).format(new Date())
}

function daysAgo(days: number, hours: number) {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString()
}

function randomReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return `QX-${[...bytes]
    .map((byte) => byte.toString(36).toUpperCase())
    .join('')
    .slice(0, 7)}`
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function cacheKeyFor(request: LedgerRequest, model: string) {
  const monthKey = new Date().toISOString().slice(0, 7)
  return sha256(
    JSON.stringify({
      promptVersion: PROMPT_VERSION,
      model,
      balance: request.balance,
      monthlyBudget: request.monthlyBudget,
      monthKey,
    }),
  )
}

function buildPrompt(request: LedgerRequest) {
  const bounds = spendBoundsFor(request.balance, request.monthlyBudget)

  return `Generate 9 to 13 fictional outgoing transactions for a Nigerian personal bank account.
Return JSON only, with no markdown or commentary, in exactly this shape:
{"transactions":[{"id":"...","direction":"out","amount":2500,"counterparty":"...","bank":"...","accountNumber":"0123456789","description":"...","category":"food","createdAt":"2026-10-20T12:00:00.000Z","status":"completed","reference":"QX-..."}]}

Requirements:
- Only outgoing transactions. Do not include salary, incoming credits, opening balances, or adjustments.
- Amounts are whole naira, each at least 250.
- Target total outgoing spend: ${bounds.target} NGN. Keep the total between ${bounds.lower} and ${bounds.upper} NGN.
- Dates must be valid ISO 8601 timestamps between 1 hour and 9 days ago, newest first.
- Use realistic Nigerian merchants, transport, bills, food, shopping, health, and entertainment.
- Categories must be one of: food, transport, bills, shopping, entertainment, health, transfer, savings, other.
- Every transaction must have status "completed" and a unique id and reference.
- Never use real personal data, phone numbers, emails, or real bank account numbers. Fictional 10-digit account numbers are allowed.
- The decoy account balance is ${request.balance} NGN. The server will add the salary credit.`
}

function extractText(value: unknown) {
  if (typeof value === 'string') return value
  if (!isRecord(value)) return null
  return typeof value.response === 'string' ? value.response : null
}

function extractTransactions(text: string): unknown[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')

  const candidates = [cleaned]
  const arrayStart = cleaned.indexOf('[')
  const arrayEnd = cleaned.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(cleaned.slice(arrayStart, arrayEnd + 1))
  }

  const objectStart = cleaned.indexOf('{')
  const objectEnd = cleaned.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(cleaned.slice(objectStart, objectEnd + 1))
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (Array.isArray(parsed)) return parsed
      if (isRecord(parsed) && Array.isArray(parsed.transactions)) {
        return parsed.transactions
      }
    } catch {
      continue
    }
  }

  throw new ApiError(502, 'Decoy generation returned unreadable data.')
}

function salaryTransaction(amount: number, outgoing: Transaction[]): Transaction {
  const ids = new Set(
    outgoing.map((transaction) => transaction.id).filter((id) => typeof id === 'string'),
  )
  const references = new Set(
    outgoing
      .map((transaction) => transaction.reference)
      .filter((reference) => typeof reference === 'string'),
  )

  let id = 'ai_decoy_anchor_salary'
  while (ids.has(id)) id = `ai_decoy_anchor_${Math.random().toString(36).slice(2, 8)}`

  let reference = randomReference()
  while (references.has(reference)) reference = randomReference()

  return {
    id,
    direction: 'in',
    amount,
    counterparty: 'Salary',
    bank: 'Quanto',
    description: `${monthName()} salary`,
    category: 'income',
    createdAt: daysAgo(10, 1),
    status: 'completed',
    reference,
  }
}

function buildLedger(raw: unknown[], request: LedgerRequest) {
  if (raw.length < MIN_OUTGOING || raw.length > MAX_OUTGOING) {
    throw new ApiError(502, 'Decoy generation returned the wrong number of transactions.')
  }

  for (const item of raw) {
    if (!isRecord(item) || item.direction !== 'out') {
      throw new ApiError(502, 'Decoy generation returned an unsupported transaction.')
    }
  }

  const outgoing = raw as Transaction[]
  const totalOutgoing = outgoing.reduce((total, transaction) => {
    return total + (typeof transaction.amount === 'number' ? transaction.amount : Number.NaN)
  }, 0)
  if (!Number.isInteger(totalOutgoing) || totalOutgoing <= 0) {
    throw new ApiError(502, 'Decoy generation returned invalid amounts.')
  }

  const bounds = spendBoundsFor(request.balance, request.monthlyBudget)
  if (totalOutgoing < bounds.lower || totalOutgoing > bounds.upper) {
    throw new ApiError(502, 'Decoy generation returned an implausible spend total.')
  }

  const salary = salaryTransaction(request.balance + totalOutgoing, outgoing)
  return validateDuressLedger([...outgoing, salary], request.balance)
}

async function generateWithAi(request: LedgerRequest, env: Env, model: string) {
  if (!env.AI) {
    throw new ApiError(503, 'Decoy generation is not configured.')
  }

  let result: unknown
  try {
    result = await env.AI.run(model, {
      messages: [
        {
          role: 'system',
          content:
            'You create fictional Nigerian personal-bank transaction histories for a decoy account. Return JSON only. Never include real personal data or commentary.',
        },
        { role: 'user', content: buildPrompt(request) },
      ],
      temperature: 0.6,
      max_tokens: 2_048,
    })
  } catch (error) {
    console.error('Workers AI request failed', error)
    throw new ApiError(502, 'Decoy generation is temporarily unavailable.')
  }

  const text = extractText(result)
  if (!text) {
    throw new ApiError(502, 'Decoy generation returned an empty response.')
  }

  return buildLedger(extractTransactions(text), request)
}

async function readCache(
  cacheKey: string,
  request: LedgerRequest,
  env: Env,
): Promise<{ ledger: Transaction[]; model: string; generatedAt: string } | null> {
  if (!env.DB) return null

  try {
    const row = await env.DB.prepare(
      'SELECT payload, model, generated_at FROM decoy_ledgers WHERE cache_key = ? AND expires_at > ?',
    )
      .bind(cacheKey, new Date().toISOString())
      .first<CachedLedger>()

    if (!row) return null

    const ledger = validateDuressLedger(JSON.parse(row.payload), request.balance)
    return { ledger, model: row.model, generatedAt: row.generated_at }
  } catch (error) {
    console.error('Decoy cache read failed', error)
    return null
  }
}

async function writeCache(
  cacheKey: string,
  ledger: Transaction[],
  model: string,
  env: Env,
) {
  if (!env.DB) return

  const now = new Date()
  try {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO decoy_ledgers (cache_key, payload, model, generated_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(
        cacheKey,
        JSON.stringify(ledger),
        model,
        now.toISOString(),
        new Date(now.getTime() + CACHE_TTL_MS).toISOString(),
      )
      .run()
  } catch (error) {
    console.error('Decoy cache write failed', error)
  }
}

async function handle(request: Request, env: Env, origin: string | null) {
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin, env) })
  }

  if (url.pathname === '/health' && request.method === 'GET') {
    return jsonResponse(
      { ok: true, ai: Boolean(env.AI), cache: Boolean(env.DB) },
      200,
      origin,
      env,
    )
  }

  if (url.pathname !== '/api/duress/ledger') {
    return jsonResponse({ error: 'Not found.' }, 404, origin, env)
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, origin, env)
  }

  const payload = await readRequestBody(request)
  const model = env.AI_MODEL ?? DEFAULT_MODEL
  const cacheKey = await cacheKeyFor(payload, model)
  const cached = await readCache(cacheKey, payload, env)

  if (cached) {
    return jsonResponse(
      {
        ledger: cached.ledger,
        source: 'cache',
        model: cached.model,
        generatedAt: cached.generatedAt,
      },
      200,
      origin,
      env,
    )
  }

  const ledger = await generateWithAi(payload, env, model)
  await writeCache(cacheKey, ledger, model, env)
  return jsonResponse(
    {
      ledger,
      source: 'ai',
      model,
      generatedAt: new Date().toISOString(),
    },
    200,
    origin,
    env,
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin')
    if (origin && !isAllowedOrigin(origin, env)) {
      return jsonResponse({ error: 'Origin not allowed.' }, 403, origin, env)
    }

    try {
      return await handle(request, env, origin)
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonResponse({ error: error.message }, error.status, origin, env)
      }
      console.error('Unexpected decoy worker error', error)
      return jsonResponse({ error: 'Unexpected error.' }, 500, origin, env)
    }
  },
} satisfies ExportedHandler<Env>
