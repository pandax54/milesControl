import type { PromoType } from '@/generated/prisma/client';

// ==================== Constants ====================

/**
 * Known program names for regex-based extraction from titles.
 * Order matters: longer names first to avoid partial matches.
 */
export const KNOWN_PROGRAMS = [
  'Azul Fidelidade',
  'Latam Pass',
  'TudoAzul',
  'Smiles',
  'Livelo',
  'Esfera',
  'Azul',
  'iupp',
] as const;

/**
 * Regex patterns for extracting promotion metadata from article titles.
 */
export const BONUS_PERCENT_PATTERN = /(?:até\s+)?(\d+)%\s*(?:de\s+)?bônus/i;
export const DISCOUNT_PERCENT_PATTERN = /(?:até\s+)?(\d+)%\s*(?:de\s+)?desconto/i;
export const TRANSFER_KEYWORDS_PATTERN = /transfer[êe]ncia|bônus.*transfer|transfira/i;
export const PURCHASE_KEYWORDS_PATTERN = /compra\s+de\s+pontos|comprar\s+pontos|desconto.*compra/i;
export const CLUB_KEYWORDS_PATTERN = /clube|assinatura|assine/i;

// ==================== Pure extraction helpers ====================

export function classifyPromoType(title: string, categories: string[]): PromoType {
  const lowerTitle = title.toLowerCase();
  const lowerCategories = categories.map((c) => c.toLowerCase());

  if (CLUB_KEYWORDS_PATTERN.test(lowerTitle)) {
    return 'CLUB_SIGNUP';
  }

  const isTransfer =
    TRANSFER_KEYWORDS_PATTERN.test(lowerTitle) ||
    lowerCategories.includes('transferência de pontos');
  const isPurchase =
    PURCHASE_KEYWORDS_PATTERN.test(lowerTitle) ||
    lowerCategories.includes('compra de pontos');

  if (isTransfer && isPurchase) {
    return 'MIXED';
  }
  if (isTransfer) {
    return 'TRANSFER_BONUS';
  }
  if (isPurchase) {
    return 'POINT_PURCHASE';
  }

  return 'MIXED';
}

export function extractBonusPercent(title: string): number | undefined {
  const match = title.match(BONUS_PERCENT_PATTERN);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function extractDiscountPercent(title: string): number | undefined {
  const match = title.match(DISCOUNT_PERCENT_PATTERN);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function extractPrograms(title: string): { source?: string; destination?: string } {
  const lowerTitle = title.toLowerCase();
  const rawMatches: string[] = [];

  for (const program of KNOWN_PROGRAMS) {
    if (lowerTitle.includes(program.toLowerCase())) {
      rawMatches.push(program);
    }
  }

  // Remove programs that are substrings of already-matched longer programs
  // e.g., "Azul" should not match when "Azul Fidelidade" already matched
  const foundPrograms = rawMatches.filter(
    (p) => !rawMatches.some((other) => other !== p && other.toLowerCase().includes(p.toLowerCase())),
  );

  if (foundPrograms.length === 0) {
    return {};
  }

  if (foundPrograms.length === 1) {
    return { destination: foundPrograms[0] };
  }

  // For transfer promos: "Transfira pontos X para o Y" pattern
  const transferPattern = /(?:transfira|transfer[êe]ncia|envie).*?([\wÀ-ú\s]+?)(?:\s+para\s+|\s+→\s+)([\wÀ-ú\s]+)/i;
  const transferMatch = title.match(transferPattern);

  if (transferMatch) {
    const sourcePart = transferMatch[1].toLowerCase();
    const destPart = transferMatch[2].toLowerCase();

    const source = foundPrograms.find((p) => sourcePart.includes(p.toLowerCase()));
    const destination = foundPrograms.find((p) => destPart.includes(p.toLowerCase()));

    if (source && destination) {
      return { source, destination };
    }
  }

  // Fallback: "Y nas transferências da X" (destination in bonus, source after "da/do")
  const reversePattern = /(?:bônus|bonus).*(?:da|do|das|dos)\s+([\wÀ-ú\s]+)/i;
  const reverseMatch = title.match(reversePattern);

  if (reverseMatch) {
    const sourcePart = reverseMatch[1].toLowerCase();
    const source = foundPrograms.find((p) => sourcePart.includes(p.toLowerCase()));
    const destination = foundPrograms.find((p) => p !== source);

    if (source && destination) {
      return { source, destination };
    }
  }

  // Fallback order follows KNOWN_PROGRAMS array order, not title position.
  // This is acceptable since transfer direction is already handled by
  // explicit patterns above; this branch is for ambiguous titles.
  return { source: foundPrograms[0], destination: foundPrograms[1] };
}
