import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '../helpers/prisma-mock'

import { verifyApiKey, getApiKeyFromRequest, hashApiKey } from '@/lib/api-auth'

describe('hashApiKey', () => {
  it('should return a sha256 hex string', () => {
    const hash = hashApiKey('my-api-key')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should be deterministic', () => {
    expect(hashApiKey('key')).toBe(hashApiKey('key'))
  })

  it('should differ for different keys', () => {
    expect(hashApiKey('key1')).not.toBe(hashApiKey('key2'))
  })
})

describe('getApiKeyFromRequest', () => {
  it('should extract API key from Authorization Bearer header', () => {
    const req = new Request('http://localhost/api', {
      headers: { Authorization: 'Bearer my-secret-key' },
    }) as any
    expect(getApiKeyFromRequest(req)).toBe('my-secret-key')
  })

  it('should extract API key from X-API-Key header', () => {
    const req = new Request('http://localhost/api', {
      headers: { 'x-api-key': 'another-key' },
    }) as any
    expect(getApiKeyFromRequest(req)).toBe('another-key')
  })

  it('should prefer Authorization over X-API-Key', () => {
    const req = new Request('http://localhost/api', {
      headers: { Authorization: 'Bearer bearer-key', 'x-api-key': 'header-key' },
    }) as any
    expect(getApiKeyFromRequest(req)).toBe('bearer-key')
  })

  it('should return null when no key provided', () => {
    const req = new Request('http://localhost/api') as any
    expect(getApiKeyFromRequest(req)).toBeNull()
  })

  it('should ignore api_key query param and return null', () => {
    const req = new Request('http://localhost/api?api_key=deprecated-key') as any
    expect(getApiKeyFromRequest(req)).toBeNull()
  })
})

describe('verifyApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return invalid when null key provided', async () => {
    const result = await verifyApiKey(null)
    expect(result.valid).toBe(false)
  })

  it('should return invalid when key not found in DB', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue(null)
    const result = await verifyApiKey('nonexistent-key')
    expect(result.valid).toBe(false)
  })

  it('should return invalid when key is inactive', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1',
      keyHash: 'hash',
      name: 'Test',
      rateLimit: 100,
      isActive: false,
      lastUsedAt: null,
    })
    const result = await verifyApiKey('some-key')
    expect(result.valid).toBe(false)
  })

  it('should return valid with apiKeyRecord when key is active', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1',
      keyHash: 'hash',
      name: 'Test Key',
      rateLimit: 100,
      isActive: true,
      lastUsedAt: null,
    })
    mockPrisma.apiKey.update.mockResolvedValue({})

    const result = await verifyApiKey('valid-key')
    expect(result.valid).toBe(true)
    expect(result.apiKeyRecord?.id).toBe('key1')
    expect(result.apiKeyRecord?.name).toBe('Test Key')
  })

  it('should update lastUsedAt when it was never set', async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1',
      keyHash: 'hash',
      name: 'Test Key',
      rateLimit: 100,
      isActive: true,
      lastUsedAt: null,
    })
    mockPrisma.apiKey.update.mockResolvedValue({})

    await verifyApiKey('valid-key')
    expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key1' },
        data: { lastUsedAt: expect.any(Date) },
      })
    )
  })

  it('should NOT update lastUsedAt when used within the last hour', async () => {
    const recentTime = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1',
      keyHash: 'hash',
      name: 'Test Key',
      rateLimit: 100,
      isActive: true,
      lastUsedAt: recentTime,
    })

    await verifyApiKey('valid-key')
    expect(mockPrisma.apiKey.update).not.toHaveBeenCalled()
  })

  it('should update lastUsedAt when last used more than 1 hour ago', async () => {
    const oldTime = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 'key1',
      keyHash: 'hash',
      name: 'Test Key',
      rateLimit: 100,
      isActive: true,
      lastUsedAt: oldTime,
    })
    mockPrisma.apiKey.update.mockResolvedValue({})

    await verifyApiKey('valid-key')
    expect(mockPrisma.apiKey.update).toHaveBeenCalled()
  })
})
