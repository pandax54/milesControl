import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/integrations/resend';
import type { AlertMatchResult } from './alert-matcher.service';

// ==================== Constants ====================

const RATING_COLORS: Record<string, string> = {
  EXCELLENT: '#16a34a',
  GOOD: '#2563eb',
  ACCEPTABLE: '#d97706',
  AVOID: '#dc2626',
};

const DEFAULT_RATING_COLOR = '#6b7280';

// ==================== Types ====================

export interface SendEmailAlertsResult {
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
}

// ==================== Email builder ====================

/**
 * Build an HTML email for a promotion alert notification.
 * Renders a clean branded email with the promotion title and details.
 */
export function buildAlertEmailHtml(title: string, body: string, rating?: string): string {
  const ratingColor = rating ? (RATING_COLORS[rating] ?? DEFAULT_RATING_COLOR) : DEFAULT_RATING_COLOR;
  const ratingBadge = rating
    ? `<span style="display: inline-block; background: ${ratingColor}; color: #fff; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 4px; margin-bottom: 12px; letter-spacing: 0.5px;">${rating}</span>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin-bottom: 16px;">
    <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 20px;">${escapeHtml(title)}</h2>
    ${ratingBadge}
    <p style="margin: 12px 0 0 0; color: #555; font-size: 15px; line-height: 1.5;">${escapeHtml(body)}</p>
  </div>
  <p style="color: #999; font-size: 12px; margin-top: 24px;">
    Você recebeu este alerta porque configurou uma regra de notificação no MilesControl.
  </p>
  <p style="color: #999; font-size: 12px; margin-top: 4px;">
    MilesControl — Seu gerenciador de milhas e pontos
  </p>
</body>
</html>`.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==================== Notifications ====================

/**
 * Send email alert notifications for all matches that include the EMAIL channel.
 * Looks up user emails via Prisma in a single batched query.
 * Skips matches where the user email cannot be resolved.
 */
export async function sendEmailAlerts(
  matches: readonly AlertMatchResult[],
): Promise<SendEmailAlertsResult> {
  const emailMatches = matches.filter((m) => m.channels.includes('EMAIL'));

  if (emailMatches.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const userIds = [...new Set(emailMatches.map((m) => m.userId))];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });

  const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

  let succeeded = 0;
  let failed = 0;

  for (const match of emailMatches) {
    const userEmail = emailByUserId.get(match.userId);

    if (!userEmail) {
      logger.warn(
        { userId: match.userId, alertConfigId: match.alertConfigId },
        'Email alert skipped — no email found for user',
      );
      failed++;
      continue;
    }

    const html = buildAlertEmailHtml(match.notificationTitle, match.notificationBody);
    const sent = await sendEmail({
      to: userEmail,
      subject: `MilesControl — ${match.notificationTitle}`,
      html,
    });

    if (sent) {
      succeeded++;
    } else {
      failed++;
    }
  }

  logger.info(
    { attempted: emailMatches.length, succeeded, failed },
    'Email alerts dispatched',
  );

  return { attempted: emailMatches.length, succeeded, failed };
}
