import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mockSend };
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    RESEND_API_KEY: 'test-api-key',
    RESEND_FROM_EMAIL: 'MilesControl <noreply@test.com>',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sendEmail } from './resend';

beforeEach(() => {
  mockSend.mockReset();
});

describe('sendEmail', () => {
  it('should send email successfully', async () => {
    mockSend.mockResolvedValueOnce({ data: { id: 'email-1' }, error: null });

    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });

    expect(result).toBe(true);
    expect(mockSend).toHaveBeenCalledWith({
      from: 'MilesControl <noreply@test.com>',
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
    });
  });

  it('should return false when API key is not configured', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: {
        RESEND_API_KEY: undefined,
        RESEND_FROM_EMAIL: 'MilesControl <noreply@test.com>',
      },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { sendEmail: freshSendEmail } = await import('./resend');

    const result = await freshSendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result).toBe(false);
  });

  it('should return false when Resend returns error', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid API key', name: 'validation_error' },
    });

    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result).toBe(false);
  });
});
