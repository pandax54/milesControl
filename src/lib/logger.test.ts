import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  IS_DEVELOPMENT: false,
  env: {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://test',
    NEXTAUTH_SECRET: 'test-secret',
  },
}));

import { logger, createChildLogger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be a pino logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should create a child logger with context', () => {
    const child = createChildLogger({ requestId: 'test-123' });

    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
    expect(typeof child.error).toBe('function');
  });

  it('should have info level when IS_DEVELOPMENT is false', () => {
    expect(logger.level).toBe('info');
  });
});
