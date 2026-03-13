import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../helpers/prisma-mock'

// Mock api-auth to control API key validation
vi.mock('@/lib/api-auth', () => ({
  getApiKeyFromRequest: vi.fn(() => 'test-api-key'),
  verifyApiKey: vi.fn(() => ({
    valid: true,
    apiKeyRecord: { id: 'key1', name: 'Test Key', rateLimit: 100 },
  })),
  withApiAuth: vi.fn(async (req: any, handler: any) =>
    handler(req, { id: 'key1', name: 'Test Key', rateLimit: 100 })
  ),
  hashApiKey: vi.fn((k: string) => k),
}))

// Mock rate-limit for withRateLimit
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 })),
  withRateLimit: vi.fn(async (req: any, _apiKey: any, handler: any) => handler(req)),
  cleanupRateLimitStore: vi.fn(),
}))

import { OPTIONS, GET } from '@/app/api/public/candidates/route'

const makeOptionsRequest = (origin?: string) =>
  new Request('http://localhost/api/public/candidates', {
    method: 'OPTIONS',
    headers: origin ? { origin } : {},
  }) as any

const makeGetRequest = (apiKey?: string, origin?: string) => {
  const headers: Record<string, string> = {}
  if (apiKey) headers['x-api-key'] = apiKey
  if (origin) headers['origin'] = origin
  return new Request('http://localhost/api/public/candidates', {
    method: 'GET',
    headers,
  }) as any
}

describe('OPTIONS /api/public/candidates (CORS preflight)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 204 for OPTIONS request', async () => {
    const req = makeOptionsRequest('https://example.com')
    const res = await OPTIONS(req)
    expect(res.status).toBe(204)
  })

  it('should include CORS headers in OPTIONS response', async () => {
    const req = makeOptionsRequest('https://example.com')
    const res = await OPTIONS(req)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  })

  it('should return 204 even without origin header', async () => {
    const req = makeOptionsRequest()
    const res = await OPTIONS(req)
    expect(res.status).toBe(204)
  })
})

describe('GET /api/public/candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return candidates list with CORS headers', async () => {
    mockPrisma.candidate.findMany.mockResolvedValue([
      { id: 'cand1', name: '候補者A', slug: 'candidate-a' },
      { id: 'cand2', name: '候補者B', slug: 'candidate-b' },
    ])

    const req = makeGetRequest('valid-key', 'https://example.com')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(2)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })

  it('should return empty array when no candidates', async () => {
    mockPrisma.candidate.findMany.mockResolvedValue([])

    const req = makeGetRequest('valid-key')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(0)
  })
})
