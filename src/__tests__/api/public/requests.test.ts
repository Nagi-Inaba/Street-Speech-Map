import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../helpers/prisma-mock'

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 })),
}))

import { POST } from '@/app/api/public/requests/route'
import { checkRateLimit } from '@/lib/rate-limit'

const makeRequest = (body: object, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/public/requests', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  }) as any

describe('POST /api/public/requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 })
  })

  it('should return 400 for invalid request type', async () => {
    const req = makeRequest({ type: 'INVALID_TYPE', payload: {} })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should create a public request and return 200', async () => {
    const created = {
      id: 'req1',
      type: 'CREATE_EVENT',
      status: 'PENDING',
      candidateId: 'cand1',
      payload: '{}',
    }
    mockPrisma.publicRequest.create.mockResolvedValue(created)

    const req = makeRequest({
      type: 'CREATE_EVENT',
      candidateId: 'cand1',
      payload: { title: 'Test' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('req1')
  })

  it('should return 429 when rate limit exceeded', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 })

    const req = makeRequest({
      type: 'CREATE_EVENT',
      candidateId: 'cand1',
      payload: {},
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
  })

  it('should include dedupeKey for CREATE_EVENT with lat/lng/candidateId', async () => {
    const created = {
      id: 'req2',
      type: 'CREATE_EVENT',
      status: 'PENDING',
      dedupeKey: 'cand1:2026-01-01:morning:35.680:139.767',
      payload: '{}',
    }
    mockPrisma.publicRequest.create.mockResolvedValue(created)

    const req = makeRequest({
      type: 'CREATE_EVENT',
      candidateId: 'cand1',
      lat: 35.6804,
      lng: 139.7676,
      payload: { startAt: '2026-01-01T09:00:00Z' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    // dedupeKey should be passed to create
    expect(mockPrisma.publicRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dedupeKey: expect.any(String) }),
      })
    )
  })

  it('should accept REPORT_MOVE type', async () => {
    const created = { id: 'req3', type: 'REPORT_MOVE', status: 'PENDING', payload: '{}' }
    mockPrisma.publicRequest.create.mockResolvedValue(created)

    const req = makeRequest({
      type: 'REPORT_MOVE',
      eventId: 'event1',
      lat: 35.0,
      lng: 135.0,
      payload: {},
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
