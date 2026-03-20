import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface TransferSource {
  programName: string;
  currentBalance: number;
  transferRatio: number;
  potentialMiles: number;
}

export interface PotentialBalance {
  targetProgramName: string;
  targetProgramCurrency: string;
  currentBalance: number;
  sources: TransferSource[];
  totalPotentialMiles: number;
}

interface TransferPartnerEntry {
  name: string;
  defaultRatio: string;
}

const DEFAULT_TRANSFER_RATIO = 1;

export function parseTransferRatio(ratioString: string): number {
  const parts = ratioString.split(':');
  if (parts.length !== 2) {
    return DEFAULT_TRANSFER_RATIO;
  }

  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);

  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
    return DEFAULT_TRANSFER_RATIO;
  }

  return numerator / denominator;
}

export function isValidTransferPartners(value: unknown): value is TransferPartnerEntry[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.name === 'string' &&
      typeof entry.defaultRatio === 'string'
  );
}

export async function calculatePotentialBalances(userId: string): Promise<PotentialBalance[]> {
  const enrollments = await prisma.programEnrollment.findMany({
    where: { userId },
    include: {
      program: {
        select: {
          id: true,
          name: true,
          type: true,
          currency: true,
          transferPartners: true,
        },
      },
    },
  });

  const airlineEnrollments = enrollments.filter((e) => e.program.type === 'AIRLINE');
  const bankingEnrollments = enrollments.filter((e) => e.program.type === 'BANKING');

  if (airlineEnrollments.length === 0 || bankingEnrollments.length === 0) {
    logger.debug({ userId }, 'No potential balances — missing airline or banking enrollments');
    return [];
  }

  const bankingByName = new Map(
    bankingEnrollments.map((e) => [e.program.name, e])
  );

  const results: PotentialBalance[] = [];

  for (const airlineEnrollment of airlineEnrollments) {
    const transferPartners = airlineEnrollment.program.transferPartners;

    if (!isValidTransferPartners(transferPartners)) {
      continue;
    }

    const sources: TransferSource[] = [];

    for (const partner of transferPartners) {
      const bankingEnrollment = bankingByName.get(partner.name);
      if (!bankingEnrollment || bankingEnrollment.currentBalance <= 0) {
        continue;
      }

      const ratio = parseTransferRatio(partner.defaultRatio);
      const potentialMiles = Math.floor(bankingEnrollment.currentBalance * ratio);

      sources.push({
        programName: partner.name,
        currentBalance: bankingEnrollment.currentBalance,
        transferRatio: ratio,
        potentialMiles,
      });
    }

    if (sources.length === 0) {
      continue;
    }

    const totalFromSources = sources.reduce((sum, s) => sum + s.potentialMiles, 0);

    results.push({
      targetProgramName: airlineEnrollment.program.name,
      targetProgramCurrency: airlineEnrollment.program.currency,
      currentBalance: airlineEnrollment.currentBalance,
      sources,
      totalPotentialMiles: airlineEnrollment.currentBalance + totalFromSources,
    });
  }

  logger.info(
    { userId, airlineCount: results.length },
    'Potential balances calculated'
  );

  return results;
}
