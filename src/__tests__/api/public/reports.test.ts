import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../helpers/prisma-mock'

// Mock rate-limit so we can control it per test
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 })),
  cleanupRateLimitStore: vi.fn(),
}))

// Mock move-hint
vi.mock('@/lib/move-hint', () => ({
  generateMoveHints: vi.fn(),
}))

import { POST } from '@/app/api/public/reports/route'
import { checkRateLimit } from '@/lib/rate-limit'

const makeRequest = (body: object, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/public/reports', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  }) as any

describe('POST /api/public/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetAt: Date.now() + 60000 })
  })

  it('should return 429 when rate limit exceeded', async () => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 })

    const req = makeRequest({ eventId: 'event1', kind: 'check' })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toBe('Too many requests')
    expect(json.retryAfter).toBeGreaterThan(0)
  })

  it('should return 400 for invalid body', async () => {
    const req = makeRequest({ eventId: 'event1', kind: 'invalid-kind' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 409 when already reported', async () => {
    mockPrisma.publicReport.findUnique.mockResolvedValue({
      id: 'existing',
      eventId: 'event1',
      kind: 'check',
      reporterHash: 'abc',
    })

    const req = makeRequest({ eventId: 'event1', kind: 'check' })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('Already reported')
  })

  it('should create report and return 200', async () => {
    mockPrisma.publicReport.findUnique.mockResolvedValue(null)
    const createdReport = { id: 'report1', eventId: 'event1', kind: 'check', reporterHash: 'abc', createdAt: new Date() }
    mockPrisma.publicReport.create.mockResolvedValue(createdReport)

    const req = makeRequest({ eventId: 'event1', kind: 'check' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('report1')
  })

  it('should auto-transition PLANNED to LIVE when 2 start reports', async () => {
    mockPrisma.publicReport.findUnique.mockResolvedValue(null)
    const createdReport = { id: 'report2', eventId: 'event1', kind: 'start', reporterHash: 'abc', createdAt: new Date() }
    mockPrisma.publicReport.create.mockResolvedValue(createdReport)
    mockPrisma.publicReport.count.mockResolvedValue(2)
    mockPrisma.speechEvent.findUnique.mockResolvedValue({
      id: 'event1',
      status: 'PLANNED',
      lat: 35.0,
      lng: 135.0,
      locationText: '東京',
      startAt: null,
      endAt: null,
    })
    mockPrisma.eventHistory.create.mockResolvedValue({})
    mockPrisma.speechEvent.update.mockResolvedValue({ id: 'event1', status: 'LIVE' })

    const req = makeRequest({ eventId: 'event1', kind: 'start' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.speechEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'LIVE' } })
    )
  })

  it('should auto-transition LIVE to ENDED when 2 end reports', async () => {
    mockPrisma.publicReport.findUnique.mockResolvedValue(null)
    const createdReport = { id: 'report3', eventId: 'event1', kind: 'end', reporterHash: 'abc', createdAt: new Date() }
    mockPrisma.publicReport.create.mockResolvedValue(createdReport)
    mockPrisma.publicReport.count.mockResolvedValue(2)
    mockPrisma.speechEvent.findUnique.mockResolvedValue({
      id: 'event1',
      status: 'LIVE',
      lat: 35.0,
      lng: 135.0,
      locationText: '東京',
      startAt: null,
      endAt: null,
    })
    mockPrisma.eventHistory.create.mockResolvedValue({})
    mockPrisma.speechEvent.update.mockResolvedValue({ id: 'event1', status: 'ENDED' })

    const req = makeRequest({ eventId: 'event1', kind: 'end' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.speechEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ENDED' } })
    )
  })

  it('should not transition status when only 1 start report exists', async () => {
    mockPrisma.publicReport.findUnique.mockResolvedValue(null)
    const createdReport = { id: 'report4', eventId: 'event1', kind: 'start', reporterHash: 'abc', createdAt: new Date() }
    mockPrisma.publicReport.create.mockResolvedValue(createdReport)
    mockPrisma.publicReport.count.mockResolvedValue(1)

    const req = makeRequest({ eventId: 'event1', kind: 'start' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockPrisma.speechEvent.update).not.toHaveBeenCalled()
  })
})
