import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../../helpers/prisma-mock'

// Mock auth to control session
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { PUT } from '@/app/api/admin/events/[id]/route'
import { auth } from '@/lib/auth'

const mockSession = {
  user: { id: 'user1', role: 'SiteStaff', email: 'staff@example.com' },
}

const validBody = {
  candidateId: 'cand1',
  additionalCandidateIds: [],
  status: 'LIVE',
  startAt: '2026-01-01T09:00:00Z',
  endAt: '2026-01-01T10:00:00Z',
  timeUnknown: false,
  locationText: '東京駅前',
  lat: 35.6812,
  lng: 139.7671,
  notes: null,
  isPublic: true,
}

const makeRequest = (body: object) =>
  new Request('http://localhost/api/admin/events/event1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('PUT /api/admin/events/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(mockSession as any)
  })

  it('should return 401 when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const req = makeRequest(validBody)
    const res = await PUT(req, makeParams('event1'))
    expect(res.status).toBe(401)
  })

  it('should return 401 when role is insufficient', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user2', role: 'RegionEditor', email: 'editor@example.com' },
    } as any)

    const req = makeRequest(validBody)
    const res = await PUT(req, makeParams('event1'))
    expect(res.status).toBe(401)
  })

  it('should return 404 when event not found', async () => {
    mockPrisma.speechEvent.findUnique.mockResolvedValue(null)

    const req = makeRequest(validBody)
    const res = await PUT(req, makeParams('event1'))
    expect(res.status).toBe(404)
  })

  it('should return 400 when candidateId duplicates in additionalCandidateIds', async () => {
    mockPrisma.speechEvent.findUnique.mockResolvedValue({
      id: 'event1',
      candidateId: 'cand1',
      lat: 35.0,
      lng: 135.0,
      locationText: '東京',
      startAt: null,
      endAt: null,
      status: 'PLANNED',
      candidate: { slug: 'test-cand' },
    })

    const req = makeRequest({ ...validBody, additionalCandidateIds: ['cand1'] })
    const res = await PUT(req, makeParams('event1'))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('重複')
  })

  it('should run transaction and return updated event', async () => {
    const existingEvent = {
      id: 'event1',
      candidateId: 'cand1',
      lat: 35.0,
      lng: 135.0,
      locationText: '旧場所',
      startAt: null,
      endAt: null,
      status: 'PLANNED',
      candidate: { slug: 'test-cand', id: 'cand1' },
    }
    const updatedEvent = {
      id: 'event1',
      candidateId: 'cand1',
      status: 'LIVE',
      lat: 35.6812,
      lng: 139.7671,
      locationText: '東京駅前',
      candidate: { slug: 'test-cand', id: 'cand1' },
      additionalCandidates: [],
    }

    mockPrisma.speechEvent.findUnique.mockResolvedValue(existingEvent)
    // $transaction receives array of prisma operations - mock to return the results
    mockPrisma.$transaction.mockImplementation(async (ops: any[]) => {
      // Resolve each mock promise in the array
      return Promise.all(ops)
    })
    mockPrisma.eventHistory.create.mockResolvedValue({})
    mockPrisma.eventCandidate.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.speechEvent.update.mockResolvedValue(updatedEvent)

    const req = makeRequest(validBody)
    const res = await PUT(req, makeParams('event1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('event1')
    expect(json.status).toBe('LIVE')
  })

  it('should return 400 for invalid body schema', async () => {
    mockPrisma.speechEvent.findUnique.mockResolvedValue({
      id: 'event1',
      candidateId: 'cand1',
      lat: 35.0,
      lng: 135.0,
      locationText: '東京',
      startAt: null,
      endAt: null,
      status: 'PLANNED',
      candidate: { slug: 'test-cand' },
    })

    const req = makeRequest({ ...validBody, lat: 'not-a-number' })
    const res = await PUT(req, makeParams('event1'))
    expect(res.status).toBe(400)
  })
})
