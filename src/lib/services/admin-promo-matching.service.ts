import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { matchPromotion, type PromoMatchType } from './promo-matcher.service';
import { PromotionNotFoundError } from './promotion.service';
import type { PromotionWithPrograms } from './promotion.service';

// ==================== Types ====================

export interface ClientMatchResult {
  readonly clientId: string;
  readonly clientName: string | null;
  readonly clientEmail: string;
  readonly matchType: PromoMatchType;
  readonly reason: string;
  readonly relevanceScore: number;
}

export interface PromotionClientMatchSummary {
  readonly promotionId: string;
  readonly matchedClientCount: number;
  readonly totalClientCount: number;
  readonly matches: readonly ClientMatchResult[];
}

export interface PromotionWithClientMatches {
  readonly promotion: PromotionWithPrograms;
  readonly matchedClientCount: number;
  readonly totalClientCount: number;
  readonly matches: readonly ClientMatchResult[];
}

// ==================== Internal types ====================

interface ClientEnrollmentData {
  programId: string;
  currentBalance: number;
  program: { name: string };
}

interface ClientWithEnrollments {
  id: string;
  name: string | null;
  email: string;
  programEnrollments: ClientEnrollmentData[];
}

// ==================== Data fetching ====================

async function fetchAdminClients(adminId: string): Promise<ClientWithEnrollments[]> {
  return prisma.user.findMany({
    where: { managedById: adminId },
    select: {
      id: true,
      name: true,
      email: true,
      programEnrollments: {
        select: {
          programId: true,
          currentBalance: true,
          program: { select: { name: true } },
        },
      },
    },
  });
}

// ==================== Matching logic ====================

function matchClientsToPromotion(
  clients: ClientWithEnrollments[],
  promotion: PromotionWithPrograms,
): ClientMatchResult[] {
  const results: ClientMatchResult[] = [];

  for (const client of clients) {
    const enrollments = client.programEnrollments.map((e) => ({
      programId: e.programId,
      programName: e.program.name,
      currentBalance: e.currentBalance,
    }));

    const match = matchPromotion(promotion, enrollments);
    if (match) {
      results.push({
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        matchType: match.matchType,
        reason: match.reason,
        relevanceScore: match.relevanceScore,
      });
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// ==================== Queries ====================

/**
 * Fetch all clients of an admin who match a specific promotion.
 * Results are sorted by relevance score descending (BOTH > SOURCE > DESTINATION).
 */
export async function getPromoClientMatches(
  adminId: string,
  promotionId: string,
): Promise<PromotionClientMatchSummary> {
  const [promotion, clients] = await Promise.all([
    prisma.promotion.findUnique({
      where: { id: promotionId },
      include: { sourceProgram: true, destProgram: true },
    }),
    fetchAdminClients(adminId),
  ]);

  if (!promotion) {
    throw new PromotionNotFoundError(promotionId);
  }

  const matches = matchClientsToPromotion(clients, promotion);

  logger.info(
    { adminId, promotionId, matchedClientCount: matches.length, totalClientCount: clients.length },
    'Fetched promo-client matches',
  );

  return {
    promotionId,
    matchedClientCount: matches.length,
    totalClientCount: clients.length,
    matches,
  };
}

/**
 * Fetch all active promotions with per-promotion client match details.
 * Runs a single query for all clients to avoid N+1 on client data.
 */
export async function getPromotionsWithClientMatches(
  adminId: string,
): Promise<PromotionWithClientMatches[]> {
  const [promotions, clients] = await Promise.all([
    prisma.promotion.findMany({
      where: { status: 'ACTIVE' },
      include: { sourceProgram: true, destProgram: true },
      orderBy: { detectedAt: 'desc' },
    }),
    fetchAdminClients(adminId),
  ]);

  const results = promotions.map((promotion) => {
    const matches = matchClientsToPromotion(clients, promotion);
    return {
      promotion,
      matchedClientCount: matches.length,
      totalClientCount: clients.length,
      matches,
    };
  });

  logger.info(
    { adminId, promotionCount: promotions.length, clientCount: clients.length },
    'Fetched promotions with client match details',
  );

  return results;
}
