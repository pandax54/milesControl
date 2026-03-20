import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/integrations/resend';
import { formatNumber } from '@/lib/utils/format';

const COLOR_POSITIVE = '#16a34a';
const COLOR_NEGATIVE = '#dc2626';
const COLOR_NEUTRAL = '#666';

interface BalanceChange {
  readonly programName: string;
  readonly previousBalance: number;
  readonly currentBalance: number;
  readonly change: number;
}

interface DigestResult {
  readonly userId: string;
  readonly userEmail: string;
  readonly userName: string | null;
  readonly changes: readonly BalanceChange[];
  readonly sent: boolean;
}

export type { BalanceChange, DigestResult };

export async function takeBalanceSnapshots(): Promise<number> {
  const enrollments = await prisma.programEnrollment.findMany({
    include: { program: { select: { name: true } } },
  });

  if (enrollments.length === 0) {
    logger.info('No enrollments found, skipping snapshot');
    return 0;
  }

  const snapshots = enrollments.map((e) => ({
    userId: e.userId,
    programId: e.programId,
    programName: e.program.name,
    balance: e.currentBalance,
  }));

  const result = await prisma.balanceSnapshot.createMany({ data: snapshots });

  logger.info({ count: result.count }, 'Balance snapshots created');
  return result.count;
}

export function computeBalanceChanges(
  currentEnrollments: ReadonlyArray<{
    readonly programId: string;
    readonly currentBalance: number;
    readonly program: { readonly name: string };
  }>,
  previousSnapshots: ReadonlyArray<{
    readonly programId: string;
    readonly balance: number;
    readonly programName: string;
  }>,
): BalanceChange[] {
  const previousByProgram = new Map(
    previousSnapshots.map((s) => [s.programId, s]),
  );

  const changes: BalanceChange[] = [];

  for (const enrollment of currentEnrollments) {
    const previous = previousByProgram.get(enrollment.programId);
    const previousBalance = previous?.balance ?? 0;
    const change = enrollment.currentBalance - previousBalance;

    changes.push({
      programName: enrollment.program.name,
      previousBalance,
      currentBalance: enrollment.currentBalance,
      change,
    });
  }

  // Sort: changed programs first (biggest absolute change), then unchanged
  changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  return changes;
}

export function buildDigestHtml(userName: string | null, changes: readonly BalanceChange[]): string {
  const greeting = userName ? `Olá, ${userName}!` : 'Olá!';
  const hasChanges = changes.some((c) => c.change !== 0);

  const rows = changes
    .map((c) => {
      const changeText = formatChangeText(c.change);
      const changeColor = resolveChangeColor(c.change);
      return `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${c.programName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">${formatNumber(c.currentBalance)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right; color: ${changeColor}; font-weight: 600;">${changeText}</td>
        </tr>`;
    })
    .join('');

  const summary = hasChanges
    ? 'Aqui está o resumo das mudanças nos seus saldos esta semana:'
    : 'Seus saldos não tiveram alterações esta semana.';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">${greeting}</h2>
  <p>${summary}</p>
  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <thead>
      <tr style="background: #f8f9fa;">
        <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Programa</th>
        <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Saldo Atual</th>
        <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Variação</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p style="color: #666; font-size: 14px; margin-top: 24px;">
    Mantenha seus saldos atualizados para receber relatórios precisos.
  </p>
  <p style="color: #999; font-size: 12px; margin-top: 16px;">
    MilesControl — Seu gerenciador de milhas e pontos
  </p>
</body>
</html>`.trim();
}

function formatChangeText(change: number): string {
  if (change === 0) return 'sem alteração';
  const sign = change > 0 ? '+' : '';
  return `${sign}${formatNumber(change)}`;
}

function resolveChangeColor(change: number): string {
  if (change > 0) return COLOR_POSITIVE;
  if (change < 0) return COLOR_NEGATIVE;
  return COLOR_NEUTRAL;
}

export async function sendDigestForUser(userId: string): Promise<DigestResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new UserNotFoundError(userId);
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [currentEnrollments, previousSnapshots] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { userId },
      include: { program: { select: { name: true } } },
    }),
    fetchLatestSnapshots(userId, oneWeekAgo),
  ]);

  if (currentEnrollments.length === 0) {
    logger.info({ userId }, 'User has no enrollments, skipping digest');
    return { userId, userEmail: user.email, userName: user.name, changes: [], sent: false };
  }

  const changes = computeBalanceChanges(currentEnrollments, previousSnapshots);
  const html = buildDigestHtml(user.name, changes);
  const sent = await sendEmail({
    to: user.email,
    subject: 'MilesControl — Resumo semanal dos seus saldos',
    html,
  });

  logger.info(
    { userId, programCount: changes.length, changedCount: changes.filter((c) => c.change !== 0).length, sent },
    'Balance digest processed',
  );

  return { userId, userEmail: user.email, userName: user.name, changes, sent };
}

async function fetchLatestSnapshots(
  userId: string,
  since: Date,
): Promise<Array<{ programId: string; balance: number; programName: string }>> {
  // Get the most recent snapshot per program for this user since the given date
  const snapshots = await prisma.balanceSnapshot.findMany({
    where: { userId, snapshotAt: { gte: since } },
    orderBy: { snapshotAt: 'desc' },
  });

  // Deduplicate: keep only the earliest snapshot per program (closest to the start of the period)
  const byProgram = new Map<string, { programId: string; balance: number; programName: string }>();
  for (const snapshot of snapshots) {
    // Since ordered desc, last write wins = earliest snapshot
    byProgram.set(snapshot.programId, {
      programId: snapshot.programId,
      balance: snapshot.balance,
      programName: snapshot.programName,
    });
  }

  return Array.from(byProgram.values());
}

export async function sendAllDigests(): Promise<readonly DigestResult[]> {
  const usersWithEnrollments = await prisma.user.findMany({
    where: {
      programEnrollments: { some: {} },
    },
    select: { id: true },
  });

  logger.info({ userCount: usersWithEnrollments.length }, 'Starting balance digest for all users');

  const results: DigestResult[] = [];

  for (const user of usersWithEnrollments) {
    try {
      const result = await sendDigestForUser(user.id);
      results.push(result);
    } catch (error) {
      logger.error({ err: error, userId: user.id }, 'Failed to send digest for user');
    }
  }

  // Take snapshots after sending digests (for next week's comparison)
  await takeBalanceSnapshots();

  const sentCount = results.filter((r) => r.sent).length;
  logger.info({ total: results.length, sent: sentCount }, 'Balance digest run completed');

  return results;
}

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User not found: ${userId}`);
    this.name = 'UserNotFoundError';
  }
}
