import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { load } from 'cheerio';
import type { ScraperRun } from '@/generated/prisma/client';
import { SCRAPER_RUN_STATUS } from './types';
import {
  ComparemaniaScraper,
  extractCategory,
  extractDateText,
  extractRawContent,
} from './comparemania';

// ==================== Mocks ====================

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('@/lib/services/scraper-run.service', () => ({
  createScraperRun: vi.fn(),
  completeScraperRun: vi.fn(),
}));

vi.mock('./robots-txt', () => ({
  fetchRobotsTxt: vi.fn(),
  isPathAllowed: vi.fn(),
}));

vi.mock('./rate-limiter', () => ({
  enforceRateLimit: vi.fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
}));

import { createScraperRun, completeScraperRun } from '@/lib/services/scraper-run.service';
import { fetchRobotsTxt, isPathAllowed } from './robots-txt';
import { enforceRateLimit } from './rate-limiter';

// ==================== Test fixtures ====================

function buildMockScraperRun(overrides: Partial<ScraperRun> = {}): ScraperRun {
  return {
    id: 'run-cm-123',
    sourceName: 'Comparemania',
    sourceUrl: 'https://www.comparemania.com.br/blog/',
    status: SCRAPER_RUN_STATUS.RUNNING,
    itemsFound: 0,
    newPromos: 0,
    errorMessage: null,
    durationMs: null,
    startedAt: new Date('2026-03-20T10:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

function buildCardHtml(options: {
  title: string;
  href?: string;
  dateText?: string;
  category?: string;
  excerpt?: string;
}): string {
  const href = options.href ?? 'https://www.comparemania.com.br/blog/test-article/';
  const dateText = options.dateText ?? '20/03/2026';
  const category = options.category ?? 'Pontos e Milhas';
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
  const excerpt = options.excerpt ?? '';

  const excerptHtml = excerpt
    ? `<div class="elementor-element"><div class="elementor-widget-text-editor">${excerpt}</div></div>`
    : '';

  return `
    <div class="jet-listing-grid__item">
      <div class="elementor-element">
        <div class="elementor-widget-container">
          <a href="${href}"><img src="thumb.jpg" alt=""></a>
        </div>
      </div>
      <div class="elementor-element">
        <h3 class="elementor-heading-title">
          <a href="${href}">${options.title}</a>
        </h3>
      </div>
      <div class="elementor-element">
        <a href="https://www.comparemania.com.br/blog/categoria/${categorySlug}/">${category}</a>
      </div>
      ${excerptHtml}
      <div class="elementor-element">
        <span>Anni</span>
        <span>${dateText}</span>
      </div>
    </div>
  `;
}

function buildPageHtml(cards: string[]): string {
  return `<html><body><div class="jet-listing-grid">${cards.join('\n')}</div></body></html>`;
}

// ==================== Setup ====================

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createScraperRun).mockResolvedValue(buildMockScraperRun());
  vi.mocked(completeScraperRun).mockResolvedValue(
    buildMockScraperRun({ status: SCRAPER_RUN_STATUS.SUCCESS }),
  );
  vi.mocked(fetchRobotsTxt).mockResolvedValue([]);
  vi.mocked(isPathAllowed).mockReturnValue(true);
  vi.mocked(enforceRateLimit).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ==================== extractCategory ====================

describe('extractCategory', () => {
  it('should extract category from categoria link', () => {
    const html = buildCardHtml({ title: 'Test', category: 'Pontos e Milhas' });
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const category = extractCategory(card);

    expect(category).toBe('Pontos e Milhas');
  });

  it('should return empty string when no categoria link exists', () => {
    const html = `
      <div class="jet-listing-grid__item">
        <div class="elementor-element">
          <h3 class="elementor-heading-title"><a href="#">Test</a></h3>
        </div>
      </div>
    `;
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const category = extractCategory(card);

    expect(category).toBe('');
  });

  it('should trim whitespace from category text', () => {
    const html = `
      <div class="jet-listing-grid__item">
        <div class="elementor-element">
          <h3 class="elementor-heading-title"><a href="#">Test</a></h3>
        </div>
        <div class="elementor-element">
          <a href="https://www.comparemania.com.br/blog/categoria/cashback/">  Cashback  </a>
        </div>
      </div>
    `;
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const category = extractCategory(card);

    expect(category).toBe('Cashback');
  });

  it('should extract first categoria link when multiple exist', () => {
    const html = `
      <div class="jet-listing-grid__item">
        <div class="elementor-element">
          <h3 class="elementor-heading-title"><a href="#">Test</a></h3>
        </div>
        <div class="elementor-element">
          <a href="https://www.comparemania.com.br/blog/categoria/milhas/">Milhas</a>
          <a href="https://www.comparemania.com.br/blog/categoria/cashback/">Cashback</a>
        </div>
      </div>
    `;
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const category = extractCategory(card);

    expect(category).toBe('Milhas');
  });
});

// ==================== extractDateText ====================

describe('extractDateText', () => {
  it('should extract date in DD/MM/YYYY format from card text', () => {
    const html = buildCardHtml({ title: 'Test', dateText: '18/02/2026' });
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const dateText = extractDateText(card);

    expect(dateText).toBe('18/02/2026');
  });

  it('should return empty string when no date pattern exists', () => {
    const html = `
      <div class="jet-listing-grid__item">
        <div class="elementor-element">
          <h3 class="elementor-heading-title"><a href="#">Test</a></h3>
        </div>
        <div class="elementor-element">
          <span>Anni</span>
          <span>no-date-here</span>
        </div>
      </div>
    `;
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const dateText = extractDateText(card);

    expect(dateText).toBe('');
  });

  it('should extract date even when surrounded by other text', () => {
    const html = `
      <div class="jet-listing-grid__item">
        <div class="elementor-element">
          <h3 class="elementor-heading-title"><a href="#">Test</a></h3>
        </div>
        <div class="elementor-element">
          <span>Published 15/03/2026 by author</span>
        </div>
      </div>
    `;
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const dateText = extractDateText(card);

    expect(dateText).toBe('15/03/2026');
  });
});

// ==================== extractRawContent ====================

describe('extractRawContent', () => {
  it('should return title when no excerpt exists', () => {
    const html = buildCardHtml({ title: 'Smiles com 90% de bônus' });
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const content = extractRawContent(card);

    expect(content).toBe('Smiles com 90% de bônus');
  });

  it('should combine title and excerpt when excerpt exists', () => {
    const html = buildCardHtml({
      title: 'Smiles com 90% de bônus',
      excerpt: 'Aproveite esta promoção!',
    });
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const content = extractRawContent(card);

    expect(content).toBe('Smiles com 90% de bônus Aproveite esta promoção!');
  });

  it('should return only title when excerpt is whitespace', () => {
    const html = `
      <div class="jet-listing-grid__item">
        <div class="elementor-element">
          <h3 class="elementor-heading-title">Test Title</h3>
        </div>
        <div class="elementor-element">
          <div class="elementor-widget-text-editor">   </div>
        </div>
      </div>
    `;
    const $ = load(html);
    const card = $('.jet-listing-grid__item').first();

    const content = extractRawContent(card);

    expect(content).toBe('Test Title');
  });
});

// ==================== ComparemaniaScraper ====================

describe('ComparemaniaScraper', () => {
  function mockFetchWithHtml(html: string) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(html),
    }));
  }

  describe('constructor', () => {
    it('should construct without triggering a run', () => {
      const scraper = new ComparemaniaScraper();

      expect(createScraperRun).not.toHaveBeenCalled();
    });

    it('should accept config overrides', () => {
      const scraper = new ComparemaniaScraper({ delayMs: 5000 });

      expect(scraper).toBeInstanceOf(ComparemaniaScraper);
    });
  });

  describe('run (integration via BaseScraper)', () => {
    it('should extract transfer bonus promotions from HTML', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Transfira seus pontos Livelo para Smiles com até 90% de bônus',
          href: 'https://www.comparemania.com.br/blog/livelo-bonus-smiles/',
          dateText: '20/03/2026',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].title).toBe('Transfira seus pontos Livelo para Smiles com até 90% de bônus');
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[0].bonusPercent).toBe(90);
      expect(result.promotions[0].sourceProgram).toBe('Livelo');
      expect(result.promotions[0].destinationProgram).toBe('Smiles');
      expect(result.promotions[0].sourceName).toBe('Comparemania');
      expect(result.promotions[0].sourceUrl).toBe('https://www.comparemania.com.br/blog/livelo-bonus-smiles/');
    });

    it('should extract point purchase promotions', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('POINT_PURCHASE');
      expect(result.promotions[0].purchaseDiscount).toBe(55);
      expect(result.promotions[0].destinationProgram).toBe('Livelo');
    });

    it('should extract club signup promotions', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Assine o Clube Smiles com 50% de desconto no primeiro mês',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('CLUB_SIGNUP');
      expect(result.promotions[0].purchaseDiscount).toBe(50);
      expect(result.promotions[0].destinationProgram).toBe('Smiles');
    });

    it('should extract transfer bonus with percentage', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Esfera oferece até 80% de bônus na transferência de pontos para Azul Fidelidade',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[0].bonusPercent).toBe(80);
    });

    it('should handle page with no cards', async () => {
      mockFetchWithHtml('<html><body><p>No content</p></body></html>');
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(0);
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 0,
        }),
      );
    });

    it('should skip cards without a title', async () => {
      const html = `
        <html><body>
          <div class="jet-listing-grid__item">
            <div class="elementor-element">
              <h3 class="elementor-heading-title"><a href="#"></a></h3>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(0);
    });

    it('should extract multiple promotions from a page', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Ganhe até 133% de bônus na transferência de pontos Esfera para o Azul Fidelidade',
          category: 'Pontos e Milhas',
        }),
        buildCardHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          category: 'Pontos e Milhas',
        }),
        buildCardHtml({
          title: 'Promoções de milhas, transferências e compra de pontos desta semana',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(3);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[1].type).toBe('POINT_PURCHASE');
      expect(result.promotions[2].type).toBe('MIXED');
    });

    it('should use fallback URL when card has no href', async () => {
      const html = `
        <html><body>
          <div class="jet-listing-grid__item">
            <div class="elementor-element">
              <h3 class="elementor-heading-title"><a href="">Test promo title</a></h3>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].sourceUrl).toBe('https://www.comparemania.com.br/blog/');
    });

    it('should persist scraper run on success', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Smiles com 90% de bônus',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      await scraper.run();

      expect(createScraperRun).toHaveBeenCalledWith(
        'Comparemania',
        'https://www.comparemania.com.br/blog/',
      );
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 1,
        }),
      );
    });

    it('should parse Brazilian date from card', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Smiles com bônus',
          dateText: '15/03/2026',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions[0].detectedAt.getFullYear()).toBe(2026);
      expect(result.promotions[0].detectedAt.getMonth()).toBe(2); // March
      expect(result.promotions[0].detectedAt.getDate()).toBe(15);
    });

    it('should handle cards without category label', async () => {
      const html = `
        <html><body>
          <div class="jet-listing-grid__item">
            <div class="elementor-element">
              <h3 class="elementor-heading-title">
                <a href="https://www.comparemania.com.br/blog/test.html">Smiles oferece bônus nas transferências da Livelo</a>
              </h3>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
    });

    it('should handle cards without date', async () => {
      const html = `
        <html><body>
          <div class="jet-listing-grid__item">
            <div class="elementor-element">
              <h3 class="elementor-heading-title">
                <a href="https://www.comparemania.com.br/blog/test.html">Smiles com bônus</a>
              </h3>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].detectedAt).toBeInstanceOf(Date);
    });

    it('should extract rawContent from title', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Smiles com 90% de bônus',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions[0].rawContent).toContain('Smiles com 90% de bônus');
    });

    it('should extract rawContent with excerpt when available', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Smiles com 90% de bônus',
          excerpt: 'Aproveite a promoção imperdível!',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions[0].rawContent).toContain('Smiles com 90% de bônus');
      expect(result.promotions[0].rawContent).toContain('Aproveite a promoção imperdível!');
    });

    it('should handle mixed promotion with both transfer and purchase keywords', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: '6 promoções que terminam hoje: transferência e compra de pontos com desconto',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('MIXED');
    });

    it('should extract discount percentage from title', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Livelo: até 30% de desconto na compra de pontos',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions[0].purchaseDiscount).toBe(30);
      expect(result.promotions[0].destinationProgram).toBe('Livelo');
    });

    it('should extract bonus percentage from title', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Ganhe até 100% de bônus na transferência de pontos Livelo para Smiles',
          category: 'Pontos e Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions[0].bonusPercent).toBe(100);
      expect(result.promotions[0].sourceProgram).toBe('Livelo');
      expect(result.promotions[0].destinationProgram).toBe('Smiles');
    });

    it('should handle Cashback category articles', async () => {
      const html = buildPageHtml([
        buildCardHtml({
          title: 'Azul X Casas Bahia: até 16 pontos a cada real gasto!',
          category: 'Cashback',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new ComparemaniaScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].destinationProgram).toBe('Azul');
    });
  });
});
