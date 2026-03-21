import type { CheerioAPI } from 'cheerio';
import { BaseScraper } from './base-scraper';
import type { CheerioSelection, ScrapedPromotion, ScraperConfig } from './types';
import {
  classifyPromoType,
  extractBonusPercent,
  extractDiscountPercent,
  extractPrograms,
  parseBrDate,
} from './promotion-helpers';

// ==================== Constants ====================

const SOURCE_NAME = 'Melhores Cartões';
const BASE_URL = 'https://www.melhorescartoes.com.br';
const SCRAPER_PATH = '/c/promocoes-milhas';

// ==================== Scraper class ====================

export class MelhoresCartoesScraper extends BaseScraper {
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

    $('div.post-promo-home-container').each((_index, element) => {
      const container = $(element);

      const titleLink = container.find('h3 a').first();
      const title = titleLink.text().trim();
      if (!title) {
        return; // skip entries without title
      }

      const href = titleLink.attr('href') ?? '';
      const category = extractCategory(container);
      const categories = category ? [category] : [];
      const dateText = extractDateText(container);
      const rawContent = container.text().trim();

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
        detectedAt: parseBrDate(dateText) ?? now,
      });
    });

    this.log.info({ articlesFound: promotions.length }, 'Extracted promotions from Melhores Cartões');
    return promotions;
  }
}

// ==================== MC-specific extraction helpers ====================

export function extractCategory(container: CheerioSelection): string {
  const label = container.find('.label-card').first();
  return label.text().trim();
}

export function extractDateText(container: CheerioSelection): string {
  // Try dedicated date element first
  const dateEl = container.find('.date').first();
  if (dateEl.length > 0) {
    return dateEl.text().trim();
  }

  // Fallback: search for date pattern in fim-card section
  const fimCard = container.find('.fim-card').first();
  if (fimCard.length > 0) {
    return fimCard.text().trim();
  }

  return '';
}

