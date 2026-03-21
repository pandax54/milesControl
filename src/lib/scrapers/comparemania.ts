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

const SOURCE_NAME = 'Comparemania';
const BASE_URL = 'https://www.comparemania.com.br';
const SCRAPER_PATH = '/blog/';

/**
 * Pattern to extract Brazilian dates: "DD/MM/YYYY"
 */
const BR_DATE_PATTERN = /(\d{2})\/(\d{2})\/(\d{4})/;

// ==================== Scraper class ====================

export class ComparemaniaScraper extends BaseScraper {
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

    $('.jet-listing-grid__item').each((_index, element) => {
      const card = $(element);

      const titleLink = card.find('.elementor-heading-title a').first();
      const title = titleLink.text().trim();
      if (!title) {
        return; // skip entries without title
      }

      const href = titleLink.attr('href') ?? '';
      const category = extractCategory(card);
      const categories = category ? [category] : [];
      const dateText = extractDateText(card);
      const rawContent = extractRawContent(card);

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

    this.log.info({ articlesFound: promotions.length }, 'Extracted promotions from Comparemania');
    return promotions;
  }
}

// ==================== CM-specific extraction helpers ====================

export function extractCategory(card: CheerioSelection): string {
  const categoryLink = card.find('a[href*="/categoria/"]').first();
  return categoryLink.text().trim();
}

export function extractDateText(card: CheerioSelection): string {
  const allText = card.text();
  const match = allText.match(BR_DATE_PATTERN);
  return match ? match[0] : '';
}

export function extractRawContent(card: CheerioSelection): string {
  const title = card.find('.elementor-heading-title').text().trim();
  const excerpt = card.find('.elementor-widget-text-editor').text().trim();
  return excerpt ? `${title} ${excerpt}` : title;
}

/**
 * Parses Brazilian date format "DD/MM/YYYY" into a Date object.
 */
export function parseBrDate(text: string): Date | undefined {
  if (!text) {
    return undefined;
  }

  const match = text.match(BR_DATE_PATTERN);
  if (!match) {
    return undefined;
  }

  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
