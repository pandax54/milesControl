import type { CheerioAPI } from 'cheerio';
import { BaseScraper } from './base-scraper';
import type { CheerioSelection, ScrapedPromotion, ScraperConfig } from './types';
import {
  classifyPromoType,
  extractBonusPercent,
  extractDiscountPercent,
  extractPrograms,
} from './promotion-helpers';

// ==================== Constants ====================

const SOURCE_NAME = 'Pontos Pra Voar';
const BASE_URL = 'https://pontospravoar.com';
const SCRAPER_PATH = '/category/promocoes/';

/**
 * Portuguese month names mapped to zero-indexed month numbers.
 */
const PT_MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

/**
 * Pattern to match absolute Portuguese dates like "19 de março de 2026".
 * Uses [\wÀ-ú]+ to handle accented characters (e.g., março, fevereiro).
 */
const PT_ABSOLUTE_DATE_PATTERN = /(\d{1,2})\s+de\s+([\wÀ-ú]+)\s+de\s+(\d{4})/i;

/**
 * Patterns to match relative Portuguese dates like "2 horas atrás".
 */
const RELATIVE_TIME_PATTERNS: readonly {
  readonly pattern: RegExp;
  readonly unit: 'minutes' | 'hours' | 'days';
}[] = [
  { pattern: /(\d+)\s+minutos?\s+atrás/i, unit: 'minutes' },
  { pattern: /(\d+)\s+horas?\s+atrás/i, unit: 'hours' },
  { pattern: /(\d+)\s+dias?\s+atrás/i, unit: 'days' },
];

// ==================== Scraper class ====================

export class PontosPraVoarScraper extends BaseScraper {
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

    $('article').each((_index, element) => {
      const article = $(element);

      const titleLink = article.find('h3.entry-title a').first();
      const title = titleLink.text().trim();
      if (!title) {
        return; // skip entries without title
      }

      const href = titleLink.attr('href') ?? '';
      const category = extractCategory(article);
      const categories = category ? [category] : [];
      const dateText = extractDateText(article);
      const rawContent = extractRawContent(article);

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
        detectedAt: parsePtDate(dateText, now) ?? now,
      });
    });

    this.log.info({ articlesFound: promotions.length }, 'Extracted promotions from Pontos Pra Voar');
    return promotions;
  }
}

// ==================== PPV-specific extraction helpers ====================

export function extractCategory(article: CheerioSelection): string {
  const categoryLink = article.find('a.fancy-categories').first();
  return categoryLink.text().trim();
}

export function extractDateText(article: CheerioSelection): string {
  // Date is typically a non-category <a> in .entry-meta containing relative or absolute date text
  const metaLinks = article.find('.entry-meta a');
  let dateText = '';

  metaLinks.each((_i, el) => {
    const link = article.find(el);

    if (link.hasClass('fancy-categories')) {
      return; // skip category links
    }

    const text = link.text().trim();
    if (text && (text.includes('atrás') || PT_ABSOLUTE_DATE_PATTERN.test(text))) {
      dateText = text;
    }
  });

  return dateText;
}

export function extractRawContent(article: CheerioSelection): string {
  const title = article.find('h3.entry-title').text().trim();
  const excerpt = article.find('.entry-excerpt').text().trim();
  return excerpt ? `${title} ${excerpt}` : title;
}

/**
 * Parses Portuguese date strings in two formats:
 * - Relative: "2 horas atrás", "30 minutos atrás", "1 dia atrás"
 * - Absolute: "19 de março de 2026"
 */
export function parsePtDate(text: string, now?: Date): Date | undefined {
  if (!text) {
    return undefined;
  }

  const referenceDate = now ?? new Date();

  // Try relative patterns first
  for (const { pattern, unit } of RELATIVE_TIME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]);
      return subtractTime(referenceDate, value, unit);
    }
  }

  // Try absolute Portuguese date
  const absoluteMatch = text.match(PT_ABSOLUTE_DATE_PATTERN);
  if (absoluteMatch) {
    const [, day, monthName, year] = absoluteMatch;
    const monthIndex = PT_MONTHS[monthName.toLowerCase()];
    if (monthIndex === undefined) {
      return undefined;
    }
    const date = new Date(Number(year), monthIndex, Number(day));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
}

function subtractTime(from: Date, value: number, unit: 'minutes' | 'hours' | 'days'): Date {
  const result = new Date(from);
  switch (unit) {
    case 'minutes':
      result.setMinutes(result.getMinutes() - value);
      break;
    case 'hours':
      result.setHours(result.getHours() - value);
      break;
    case 'days':
      result.setDate(result.getDate() - value);
      break;
  }
  return result;
}
