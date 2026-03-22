import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('@/lib/env', () => ({
  env: {
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sendMessage, sendAlertNotification, escapeHtml } from './telegram';

function makeTelegramOkResponse() {
  return Promise.resolve({
    json: () => Promise.resolve({ ok: true }),
  });
}

function makeTelegramErrorResponse(description: string) {
  return Promise.resolve({
    json: () => Promise.resolve({ ok: false, description }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('escapeHtml', () => {
  it('should escape ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('should escape less-than signs', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('should escape greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('should escape multiple HTML characters', () => {
    expect(escapeHtml('<script>alert("x & y")</script>')).toBe(
      '&lt;script&gt;alert("x &amp; y")&lt;/script&gt;',
    );
  });

  it('should return plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('sendMessage', () => {
  it('should send a message and return true on success', async () => {
    mockFetch.mockReturnValueOnce(makeTelegramOkResponse());

    const result = await sendMessage(12345, 'Hello!');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-bot-token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: 12345,
          text: 'Hello!',
          parse_mode: 'HTML',
        }),
      }),
    );
  });

  it('should return false when bot token is not configured', async () => {
    vi.resetModules();
    vi.doMock('@/lib/env', () => ({
      env: { TELEGRAM_BOT_TOKEN: undefined },
    }));
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { sendMessage: freshSendMessage } = await import('./telegram');

    const result = await freshSendMessage(12345, 'Hello!');
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should retry on failure and return true when retry succeeds', async () => {
    mockFetch
      .mockReturnValueOnce(makeTelegramErrorResponse('Bad Gateway'))
      .mockReturnValueOnce(makeTelegramOkResponse());

    const sendPromise = sendMessage(12345, 'Hello!');
    // Advance timer past the retry delay
    await vi.runAllTimersAsync();
    const result = await sendPromise;

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should return false after all retries are exhausted', async () => {
    mockFetch
      .mockReturnValueOnce(makeTelegramErrorResponse('Bad Gateway'))
      .mockReturnValueOnce(makeTelegramErrorResponse('Bad Gateway'))
      .mockReturnValueOnce(makeTelegramErrorResponse('Bad Gateway'));

    const sendPromise = sendMessage(12345, 'Hello!');
    await vi.runAllTimersAsync();
    const result = await sendPromise;

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on fetch network error', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockReturnValueOnce(makeTelegramOkResponse());

    const sendPromise = sendMessage(12345, 'Hello!');
    await vi.runAllTimersAsync();
    const result = await sendPromise;

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('sendAlertNotification', () => {
  it('should send a formatted alert notification', async () => {
    mockFetch.mockReturnValueOnce(makeTelegramOkResponse());

    const result = await sendAlertNotification(12345, 'Alert Title', 'Alert body text');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.text).toContain('🔔');
    expect(callBody.text).toContain('Alert Title');
    expect(callBody.text).toContain('Alert body text');
  });

  it('should escape HTML in title and body', async () => {
    mockFetch.mockReturnValueOnce(makeTelegramOkResponse());

    await sendAlertNotification(12345, 'Title <b>bold</b>', 'Body & more');

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(callBody.text).toContain('Title &lt;b&gt;bold&lt;/b&gt;');
    expect(callBody.text).toContain('Body &amp; more');
  });
});
