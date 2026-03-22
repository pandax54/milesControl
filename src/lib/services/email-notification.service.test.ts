import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AlertChannel } from '@/generated/prisma/client';

// ==================== Mocks ====================

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/integrations/resend', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/integrations/resend';
import { buildAlertEmailHtml, sendEmailAlerts } from './email-notification.service';
import type { AlertMatchResult } from './alert-matcher.service';

const mockFindMany = vi.mocked(prisma.user.findMany);
const mockSendEmail = vi.mocked(sendEmail);

// ==================== Factories ====================

function buildMatch(overrides: Partial<AlertMatchResult> = {}): AlertMatchResult {
  return {
    alertConfigId: 'alert-1',
    userId: 'user-1',
    promotionId: 'promo-1',
    channels: ['EMAIL'] as AlertChannel[],
    notificationTitle: '90% transfer bonus: Livelo → Smiles',
    notificationBody: 'Min transfer: 1,000 pts · Source: Passageiro de Primeira',
    ...overrides,
  };
}

// ==================== buildAlertEmailHtml ====================

describe('buildAlertEmailHtml', () => {
  it('should include the title in the output', () => {
    const html = buildAlertEmailHtml('90% transfer bonus: Livelo → Smiles', 'Body text');

    expect(html).toContain('90% transfer bonus: Livelo → Smiles');
  });

  it('should include the body in the output', () => {
    const html = buildAlertEmailHtml('Title', 'Min transfer: 1,000 pts');

    expect(html).toContain('Min transfer: 1,000 pts');
  });

  it('should include a rating badge when rating is provided', () => {
    const html = buildAlertEmailHtml('Title', 'Body', 'EXCELLENT');

    expect(html).toContain('EXCELLENT');
    expect(html).toContain('#16a34a');
  });

  it('should use the correct color for GOOD rating', () => {
    const html = buildAlertEmailHtml('Title', 'Body', 'GOOD');

    expect(html).toContain('#2563eb');
  });

  it('should use the correct color for ACCEPTABLE rating', () => {
    const html = buildAlertEmailHtml('Title', 'Body', 'ACCEPTABLE');

    expect(html).toContain('#d97706');
  });

  it('should use the correct color for AVOID rating', () => {
    const html = buildAlertEmailHtml('Title', 'Body', 'AVOID');

    expect(html).toContain('#dc2626');
  });

  it('should use default color for unknown rating', () => {
    const html = buildAlertEmailHtml('Title', 'Body', 'UNKNOWN_RATING');

    expect(html).toContain('#6b7280');
  });

  it('should not include a rating badge when rating is not provided', () => {
    const html = buildAlertEmailHtml('Title', 'Body');

    // Should not have any colored badge spans with inline style background colors from RATING_COLORS
    expect(html).not.toContain('#16a34a');
    expect(html).not.toContain('#2563eb');
  });

  it('should escape HTML in title', () => {
    const html = buildAlertEmailHtml('<script>alert("xss")</script>', 'Body');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should escape HTML in body', () => {
    const html = buildAlertEmailHtml('Title', '<img src=x onerror=alert(1)>');

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('should escape ampersands', () => {
    const html = buildAlertEmailHtml('Livelo & Smiles', 'Body');

    expect(html).toContain('Livelo &amp; Smiles');
  });

  it('should produce valid HTML structure', () => {
    const html = buildAlertEmailHtml('Title', 'Body');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });

  it('should include the MilesControl branding footer', () => {
    const html = buildAlertEmailHtml('Title', 'Body');

    expect(html).toContain('MilesControl');
  });
});

// ==================== sendEmailAlerts ====================

describe('sendEmailAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return zeroed result when no matches have EMAIL channel', async () => {
    const matches = [
      buildMatch({ channels: ['IN_APP'] as AlertChannel[] }),
      buildMatch({ channels: ['TELEGRAM'] as AlertChannel[] }),
    ];

    const result = await sendEmailAlerts(matches);

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should return zeroed result when matches list is empty', async () => {
    const result = await sendEmailAlerts([]);

    expect(result).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('should send email to user for EMAIL channel match', async () => {
    mockFindMany.mockResolvedValue([{ id: 'user-1', email: 'user@example.com' }]);
    mockSendEmail.mockResolvedValue(true);

    const matches = [buildMatch()];
    const result = await sendEmailAlerts(matches);

    expect(result).toEqual({ attempted: 1, succeeded: 1, failed: 0 });
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'MilesControl — 90% transfer bonus: Livelo → Smiles',
      }),
    );
  });

  it('should look up user emails in a single batched query', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'user-1', email: 'user1@example.com' },
      { id: 'user-2', email: 'user2@example.com' },
    ]);
    mockSendEmail.mockResolvedValue(true);

    const matches = [
      buildMatch({ userId: 'user-1' }),
      buildMatch({ userId: 'user-2' }),
    ];
    await sendEmailAlerts(matches);

    expect(mockFindMany).toHaveBeenCalledOnce();
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-1', 'user-2'] } },
      select: { id: true, email: true },
    });
  });

  it('should deduplicate userIds before querying', async () => {
    mockFindMany.mockResolvedValue([{ id: 'user-1', email: 'user@example.com' }]);
    mockSendEmail.mockResolvedValue(true);

    // Same userId in multiple matches
    const matches = [
      buildMatch({ alertConfigId: 'alert-1', userId: 'user-1' }),
      buildMatch({ alertConfigId: 'alert-2', userId: 'user-1' }),
    ];
    await sendEmailAlerts(matches);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['user-1'] } },
      }),
    );
  });

  it('should count failed when sendEmail returns false', async () => {
    mockFindMany.mockResolvedValue([{ id: 'user-1', email: 'user@example.com' }]);
    mockSendEmail.mockResolvedValue(false);

    const matches = [buildMatch()];
    const result = await sendEmailAlerts(matches);

    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
  });

  it('should count failed when user email is not found', async () => {
    mockFindMany.mockResolvedValue([]);

    const matches = [buildMatch({ userId: 'user-unknown' })];
    const result = await sendEmailAlerts(matches);

    expect(result).toEqual({ attempted: 1, succeeded: 0, failed: 1 });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('should handle mixed success and failure across multiple matches', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'user-1', email: 'user1@example.com' },
      { id: 'user-2', email: 'user2@example.com' },
    ]);
    mockSendEmail
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const matches = [
      buildMatch({ userId: 'user-1' }),
      buildMatch({ userId: 'user-2' }),
    ];
    const result = await sendEmailAlerts(matches);

    expect(result).toEqual({ attempted: 2, succeeded: 1, failed: 1 });
  });

  it('should only send emails for EMAIL channel — skip other channels', async () => {
    mockFindMany.mockResolvedValue([{ id: 'user-1', email: 'user@example.com' }]);
    mockSendEmail.mockResolvedValue(true);

    const matches = [
      buildMatch({ channels: ['IN_APP', 'EMAIL'] as AlertChannel[] }),
      buildMatch({ userId: 'user-2', channels: ['TELEGRAM'] as AlertChannel[] }),
    ];
    const result = await sendEmailAlerts(matches);

    // Only 1 EMAIL match
    expect(result.attempted).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledOnce();
  });

  it('should include promotion title in email subject', async () => {
    mockFindMany.mockResolvedValue([{ id: 'user-1', email: 'user@example.com' }]);
    mockSendEmail.mockResolvedValue(true);

    const matches = [buildMatch({ notificationTitle: '100% bonus: Esfera → Latam Pass' })];
    await sendEmailAlerts(matches);

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'MilesControl — 100% bonus: Esfera → Latam Pass',
      }),
    );
  });

  it('should include HTML in sent email', async () => {
    mockFindMany.mockResolvedValue([{ id: 'user-1', email: 'user@example.com' }]);
    mockSendEmail.mockResolvedValue(true);

    const matches = [buildMatch()];
    await sendEmailAlerts(matches);

    const callArgs = mockSendEmail.mock.calls[0][0];
    expect(callArgs.html).toContain('<!DOCTYPE html>');
    expect(callArgs.html).toContain('90% transfer bonus: Livelo');
  });
});
