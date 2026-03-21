import type { CheerioAPI } from 'cheerio';
import { BaseScraper } from './base-scraper';
import type { ScrapedPromotion, ScraperConfig } from './types';
import type { PromoType } from '@/generated/prisma/client';

// ==================== Constants ====================

const SOURCE_NAME = 'Passageiro de Primeira';
const BASE_URL = 'https://passageirodeprimeira.com';
const SCRAPER_PATH = '/';

/**
 * Categories in the card-footer that indicate miles/points promotions.
 * Lowercase for case-insensitive matching.
 */
const PROMO_CATEGORIES = new Set([
  'transferência de pontos',
  'compra de pontos',
  'passagens aéreas',
  'compre e pontue',
  'bancos e cartões',
  'programas de fidelidade',
]);

/**
 * Known program names for regex-based extraction from titles.
 * Order matters: longer names first to avoid partial matches.
 */
const KNOWN_PROGRAMS = [
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
const BONUS_PERCENT_PATTERN = /(?:até\s+)?(\d+)%\s*(?:de\s+)?bônus/i;
const DISCOUNT_PERCENT_PATTERN = /(?:até\s+)?(\d+)%\s*(?:de\s+)?desconto/i;
const TRANSFER_KEYWORDS_PATTERN = /transfer[êe]ncia|bônus.*transfer|transfira/i;
const PURCHASE_KEYWORDS_PATTERN = /compra\s+de\s+pontos|comprar\s+pontos|desconto.*compra/i;
const CLUB_KEYWORDS_PATTERN = /clube|assinatura|assine/i;

// ==================== Scraper class ====================

export class PassageiroDePrimeiraScraper extends BaseScraper {
  constructor(configOverrides?: Partial<ScraperConfig>) {
    super({
      name: SOURCE_NAME,
      baseUrl: BASE_URL,
      scraperPath: SCRAPER_PATH,
      ...configOverrides,
    });
  }

  protected extractPromotions($: CheerioAPI): ScrapedPromotion[] {
    const promotions: ScrapedPromotion[] = [];
    const now = new Date();

    $('article.card-noticia').each((_index, element) => {
      const article = $(element);
      const categories = extractCategories($, article);

      if (!isPromotionRelevant(categories)) {
        return; // skip non-promotion articles
      }

      const title = article.find('.card-header h3').first().text().trim();
      if (!title) {
        return; // skip articles without title
      }

      const href = article.find('a.card-header').attr('href') ?? '';
      const datetime = article.find('time[datetime]').attr('datetime') ?? '';
      const rawContent = article.text().trim();

      const type = classifyPromoType(title, categories);
      const bonusPercent = extractBonusPercent(title);
      const purchaseDiscount = extractDiscountPercent(title);
      const { source, destination } = extractPrograms(title);

      promotions.push({
        sourceUrl: href || this.buildUrl(),
        sourceName: SOURCE_NAME,
        title,
        type,
        sourceProgram: source,
        destinationProgram: destination,
        bonusPercent,
        purchaseDiscount,
        rawContent,
        detectedAt: parseDatetime(datetime) ?? now,
      });
    });

    this.log.info({ articlesFound: promotions.length }, 'Extracted promotions from Passageiro de Primeira');
    return promotions;
  }
}

// ==================== Pure extraction helpers ====================

type CheerioSelection = ReturnType<CheerioAPI>;

export function extractCategories($: CheerioAPI, article: CheerioSelection): string[] {
  const categories: string[] = [];
  article.find('.card-footer a').each((_i, el) => {
    const text = $(el).text().trim();
    if (text) {
      categories.push(text);
    }
  });
  return categories;
}

export function isPromotionRelevant(categories: string[]): boolean {
  return categories.some((cat) => PROMO_CATEGORIES.has(cat.toLowerCase()));
}

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
  return { source: foundPrograms[0], destination: foundPrograms[1] ?? foundPrograms[0] };
}

export function parseDatetime(datetime: string): Date | undefined {
  if (!datetime) {
    return undefined;
  }

  // Format from the site: "2026-03-20 19:50:22"
  const normalized = datetime.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
