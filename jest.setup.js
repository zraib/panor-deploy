import '@testing-library/jest-dom';

// Polyfill for TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isLocaleDomain: true,
      isReady: true,
      defaultLocale: 'en',
      domainLocales: [],
      isPreview: false,
    };
  },
}));

// Mock fetch for configuration loading
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  PANORAMA_CONFIG_MODE: 'standard',
  PANORAMA_YAW_OFFSET: '0',
  PANORAMA_PITCH_OFFSET: '0',
  PANORAMA_CAMERA_OFFSET: '1.2',
  PANORAMA_MAX_DISTANCE: '10.0',
  PANORAMA_MAX_CONNECTIONS: '6',
  NEXT_PUBLIC_DEV_MODE: 'true',
  NEXT_PUBLIC_SHOW_DEBUG_INFO: 'false',
};

// Mock window.performance
Object.defineProperty(window, 'performance', {
  value: {
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
    timing: {
      navigationStart: Date.now() - 1000,
      loadEventEnd: Date.now(),
    },
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Setup for panorama configuration tests
beforeEach(() => {
  // Reset fetch mock
  fetch.mockClear();
  
  // Mock successful config fetch by default
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      scenes: [
        {
          id: 'test-scene',
          position: { x: 0, y: 0, z: 0 },
          orientation: { yaw: 0, pitch: 0, roll: 0 },
          hotSpots: [],
        },
      ],
      viewer: {
        autorotateEnabled: false,
        controls: {
          mouseViewMode: 'drag',
        },
      },
    }),
    headers: {
      get: jest.fn((header) => {
        if (header === 'last-modified') return new Date().toISOString();
        if (header === 'content-length') return '1000';
        return null;
      }),
    },
  });
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});