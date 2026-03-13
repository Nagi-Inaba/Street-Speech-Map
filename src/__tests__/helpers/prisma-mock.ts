import { vi } from 'vitest'

export const mockPrisma = {
  speechEvent: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  publicReport: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  publicRequest: {
    count: vi.fn(),
    create: vi.fn(),
  },
  eventHistory: {
    create: vi.fn(),
  },
  eventCandidate: {
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  apiKey: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  candidate: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  siteSettings: {
    findUnique: vi.fn(),
  },
  moveHint: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))
