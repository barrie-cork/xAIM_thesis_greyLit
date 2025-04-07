// This file is used to configure the test environment for Jest
import '@testing-library/jest-dom';

// Mock global objects that are not available in the test environment
global.crypto = {
  randomUUID: () => 'test-uuid-12345',
};

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  redirect: jest.fn(),
}));

// Mock headers and cookies
global.Headers = class {
  constructor() {
    this.headers = {};
  }
  get(name) {
    return this.headers[name.toLowerCase()] || null;
  }
  set(name, value) {
    this.headers[name.toLowerCase()] = value;
  }
};

// Set up path aliases for module imports
jest.mock('@/server/trpc/router', () => ({
  appRouter: {
    createCaller: jest.fn(),
  },
}));

jest.mock('@/server/trpc/context', () => ({
  createInnerTRPCContext: jest.fn(() => ({})),
}));

jest.mock('@/server/db/client', () => ({
  prisma: {
    // Mock database client
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

// Set up global fetch mock
global.fetch = jest.fn();

// Polyfill for TextEncoder/TextDecoder if node version doesn't have it
if (!global.TextEncoder) {
  global.TextEncoder = require('util').TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn().mockReturnValue({
    route: '/',
    pathname: '',
    query: {},
    asPath: '',
    push: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn()
    },
    beforePopState: jest.fn(() => null),
    prefetch: jest.fn(() => null)
  }),
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Suppress console during tests
// Uncomment if needed for debugging
/*
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});
*/ 