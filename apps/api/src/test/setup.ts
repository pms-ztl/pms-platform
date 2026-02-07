import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/pms_test';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock console to reduce noise during tests
const originalConsole = { ...console };

beforeAll(() => {
  console.log = vi.fn();
  console.info = vi.fn();
  console.debug = vi.fn();
  // Keep error and warn for debugging
});

afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

afterEach(() => {
  vi.clearAllMocks();
});

// Global test utilities
export const createMockRequest = (overrides: Record<string, unknown> = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: {
    id: 'test-user-id',
    tenantId: 'test-tenant-id',
    email: 'test@example.com',
    role: 'EMPLOYEE',
  },
  tenant: {
    id: 'test-tenant-id',
    name: 'Test Tenant',
  },
  ...overrides,
});

export const createMockResponse = () => {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => vi.fn();

// Utility to wait for async operations
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Utility to create a mock Prisma client
export const createMockPrismaClient = () => ({
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(createMockPrismaClient())),
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  goal: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  review: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  feedback: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  tenant: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
});

// Test data factories
export const createTestUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-test-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'EMPLOYEE',
  tenantId: 'tenant-test-123',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestGoal = (overrides: Record<string, unknown> = {}) => ({
  id: 'goal-test-123',
  title: 'Test Goal',
  description: 'A test goal description',
  type: 'INDIVIDUAL',
  status: 'ACTIVE',
  progress: 0,
  ownerId: 'user-test-123',
  tenantId: 'tenant-test-123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestReview = (overrides: Record<string, unknown> = {}) => ({
  id: 'review-test-123',
  cycleId: 'cycle-test-123',
  revieweeId: 'user-test-456',
  reviewerId: 'user-test-123',
  status: 'IN_PROGRESS',
  content: {},
  tenantId: 'tenant-test-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createTestFeedback = (overrides: Record<string, unknown> = {}) => ({
  id: 'feedback-test-123',
  type: 'CONTINUOUS',
  fromUserId: 'user-test-123',
  toUserId: 'user-test-456',
  content: 'Great work!',
  category: 'COLLABORATION',
  visibility: 'PRIVATE',
  isAnonymous: false,
  tenantId: 'tenant-test-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
