import type { CheerioAPI } from 'cheerio';
import { BaseScraper } from './base-scraper';
import {
  classifyPromoType,
  extractBonusPercent,
  extractDiscountPercent,
  extractPrograms,
} from './promotion-helpers';
import type { CheerioSelection, ScrapedPromotion, ScraperConfig } from './types';

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

// ==================== PdP-specific extraction helpers ====================

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

export function parseDatetime(datetime: string): Date | undefined {
  if (!datetime) {
    return undefined;
  }

  // Format from the site: "2026-03-20 19:50:22"
  const normalized = datetime.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
