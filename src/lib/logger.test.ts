import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should be a pino logger instance', async () => {
    const { logger } = await import('./logger');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should create a child logger with context', async () => {
    const { createChildLogger } = await import('./logger');
    const child = createChildLogger({ requestId: 'test-123' });

    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
    expect(typeof child.error).toBe('function');
  });

  it('should create logger with info level in production', async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'production' } as NodeJS.ProcessEnv;

    const { logger } = await import('./logger');

    expect(logger.level).toBe('info');
  });

  it('should create logger with debug level in development', async () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' } as NodeJS.ProcessEnv;

    const { logger } = await import('./logger');

    expect(logger.level).toBe('debug');
  });
});
