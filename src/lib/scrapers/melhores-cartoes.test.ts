import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { load } from 'cheerio';
import type { ScraperRun } from '@/generated/prisma/client';
import { SCRAPER_RUN_STATUS } from './types';
import {
  MelhoresCartoesScraper,
  extractCategory,
  extractDateText,
  parseBrDate,
} from './melhores-cartoes';

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
    id: 'run-mc-123',
    sourceName: 'Melhores Cartões',
    sourceUrl: 'https://www.melhorescartoes.com.br/c/promocoes-milhas',
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

function buildArticleHtml(options: {
  title: string;
  href?: string;
  dateText?: string;
  category?: string;
  description?: string;
}): string {
  const href = options.href ?? 'https://www.melhorescartoes.com.br/test-article.html';
  const dateText = options.dateText ?? '20/03/2026 às 15:30';
  const category = options.category ?? 'Milhas';
  const description = options.description ?? 'Description of the article.';

  return `
    <div class="type-promocao">
      <div class="post-promo-home-container">
        <div class="post-promo-home-c1">
          <a href="${href}"><img src="img.webp" alt=""></a>
        </div>
        <div class="post-promo-home-c2">
          <span class="label-card">${category}</span>
          <h3><a href="${href}">${options.title}</a></h3>
          <p>${description}</p>
          <div class="fim-card">
            <span class="author">João Silva</span>
            <span class="date">${dateText}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildPageHtml(articles: string[]): string {
  return `<html><body><div class="promos_home">${articles.join('\n')}</div></body></html>`;
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
  it('should extract category from label-card span', () => {
    const html = buildArticleHtml({ title: 'Test', category: 'Milhas' });
    const $ = load(html);
    const container = $('div.post-promo-home-container').first();

    const category = extractCategory(container);

    expect(category).toBe('Milhas');
  });

  it('should return empty string when no label-card exists', () => {
    const html = `
      <div class="post-promo-home-container">
        <div class="post-promo-home-c2">
          <h3><a href="#">Test</a></h3>
        </div>
      </div>
    `;
    const $ = load(html);
    const container = $('div.post-promo-home-container').first();

    const category = extractCategory(container);

    expect(category).toBe('');
  });

  it('should trim whitespace from category text', () => {
    const html = `
      <div class="post-promo-home-container">
        <div class="post-promo-home-c2">
          <span class="label-card">  Pontos  </span>
          <h3><a href="#">Test</a></h3>
        </div>
      </div>
    `;
    const $ = load(html);
    const container = $('div.post-promo-home-container').first();

    const category = extractCategory(container);

    expect(category).toBe('Pontos');
  });

  it('should extract first label-card when multiple exist', () => {
    const html = `
      <div class="post-promo-home-container">
        <div class="post-promo-home-c2">
          <span class="label-card">Milhas e Pontos</span>
          <span class="label-card">Promoções</span>
          <h3><a href="#">Test</a></h3>
        </div>
      </div>
    `;
    const $ = load(html);
    const container = $('div.post-promo-home-container').first();

    const category = extractCategory(container);

    expect(category).toBe('Milhas e Pontos');
  });
});

// ==================== extractDateText ====================

describe('extractDateText', () => {
  it('should extract date from .date element', () => {
    const html = buildArticleHtml({ title: 'Test', dateText: '20/03/2026 às 15:30' });
    const $ = load(html);
    const container = $('div.post-promo-home-container').first();

    const dateText = extractDateText(container);

    expect(dateText).toBe('20/03/2026 às 15:30');
  });

  it('should fallback to fim-card text when no .date element', () => {
    const html = `
      <div class="post-promo-home-container">
        <div class="post-promo-home-c2">
          <h3><a href="#">Test</a></h3>
          <div class="fim-card">João Silva · 20/03/2026 às 09:00</div>
        </div>
      </div>
    `;
    const $ = load(html);
    const container = $('div.post-promo-home-container').first();

    const dateText = extractDateText(container);

    expect(dateText).toContain('20/03/2026');
  });

  it('should return empty string when no date or fim-card exists', () => {
    const html = `
      <div class="post-promo-home-container">
        <div class="post-promo-home-c2">
          <h3><a href="#">Test</a></h3>
        </div>
      </div>
    `;
    const $ = load(html);
    const container = $('div.post-promo-home-container').first();

    const dateText = extractDateText(container);

    expect(dateText).toBe('');
  });
});

// ==================== parseBrDate ====================

describe('parseBrDate', () => {
  it('should parse "DD/MM/YYYY às HH:MM" format', () => {
    const date = parseBrDate('20/03/2026 às 15:30');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(2); // March = 2 (0-indexed)
    expect(date?.getDate()).toBe(20);
  });

  it('should parse date without time component', () => {
    const date = parseBrDate('15/06/2026');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5); // June = 5
    expect(date?.getDate()).toBe(15);
  });

  it('should return undefined for empty string', () => {
    expect(parseBrDate('')).toBeUndefined();
  });

  it('should return undefined for non-date text', () => {
    expect(parseBrDate('not-a-date')).toBeUndefined();
  });

  it('should return undefined for invalid date values', () => {
    expect(parseBrDate('99/99/9999 às 25:70')).toBeUndefined();
  });

  it('should extract date from text with surrounding content', () => {
    const date = parseBrDate('João Silva · 20/03/2026 às 09:28');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getDate()).toBe(20);
  });

  it('should handle midnight time', () => {
    const date = parseBrDate('01/01/2026 às 00:00');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
  });
});

// ==================== MelhoresCartoesScraper ====================

describe('MelhoresCartoesScraper', () => {
  function mockFetchWithHtml(html: string) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(html),
    }));
  }

  describe('constructor', () => {
    it('should construct without triggering a run', () => {
      const scraper = new MelhoresCartoesScraper();

      expect(createScraperRun).not.toHaveBeenCalled();
    });

    it('should accept config overrides', () => {
      const scraper = new MelhoresCartoesScraper({ delayMs: 5000 });

      expect(scraper).toBeInstanceOf(MelhoresCartoesScraper);
    });
  });

  describe('run (integration via BaseScraper)', () => {
    it('should extract transfer bonus promotions from HTML', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Ganhe até 133% de bônus na transferência de pontos Esfera para o Azul Fidelidade',
          href: 'https://www.melhorescartoes.com.br/oferta-esfera-azul-133-bonus-mar26.html',
          dateText: '20/03/2026 às 09:28',
          category: 'Pontos',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].title).toBe('Ganhe até 133% de bônus na transferência de pontos Esfera para o Azul Fidelidade');
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[0].bonusPercent).toBe(133);
      expect(result.promotions[0].sourceProgram).toBe('Esfera');
      expect(result.promotions[0].destinationProgram).toBe('Azul Fidelidade');
      expect(result.promotions[0].sourceName).toBe('Melhores Cartões');
      expect(result.promotions[0].sourceUrl).toBe('https://www.melhorescartoes.com.br/oferta-esfera-azul-133-bonus-mar26.html');
    });

    it('should extract point purchase promotions', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          category: 'Pontos',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('POINT_PURCHASE');
      expect(result.promotions[0].purchaseDiscount).toBe(55);
      expect(result.promotions[0].destinationProgram).toBe('Livelo');
    });

    it('should extract club signup promotions', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Assine o Clube Smiles com 50% de desconto no primeiro mês',
          category: 'Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('CLUB_SIGNUP');
      expect(result.promotions[0].purchaseDiscount).toBe(50);
      expect(result.promotions[0].destinationProgram).toBe('Smiles');
    });

    it('should extract Smiles transfer bonus with Livelo', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Prorrogado! Smiles oferece até 80% de bônus na transferência de pontos Livelo',
          href: 'https://www.melhorescartoes.com.br/prorrogado-smiles-livelo-80-bonus-mar26.html',
          category: 'Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[0].bonusPercent).toBe(80);
    });

    it('should handle page with no articles', async () => {
      mockFetchWithHtml('<html><body><p>No articles</p></body></html>');
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(0);
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 0,
        }),
      );
    });

    it('should skip articles without a title', async () => {
      const html = `
        <html><body>
          <div class="post-promo-home-container">
            <div class="post-promo-home-c2">
              <span class="label-card">Milhas</span>
              <h3><a href="#"></a></h3>
              <div class="fim-card"><span class="date">20/03/2026 às 10:00</span></div>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(0);
    });

    it('should extract multiple promotions from a page', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Ganhe até 133% de bônus na transferência de pontos Esfera para o Azul Fidelidade',
          category: 'Pontos',
        }),
        buildArticleHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          category: 'Pontos',
        }),
        buildArticleHtml({
          title: 'Promoções de milhas, cartões, cashback e cupons válidas hoje!',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(3);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[1].type).toBe('POINT_PURCHASE');
      expect(result.promotions[2].type).toBe('MIXED');
    });

    it('should use fallback URL when article has no href', async () => {
      const html = `
        <html><body>
          <div class="post-promo-home-container">
            <div class="post-promo-home-c2">
              <span class="label-card">Milhas</span>
              <h3><a href="">Test promo title</a></h3>
              <div class="fim-card"><span class="date">20/03/2026 às 10:00</span></div>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].sourceUrl).toBe('https://www.melhorescartoes.com.br/c/promocoes-milhas');
    });

    it('should persist scraper run on success', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com 90% de bônus',
          category: 'Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      await scraper.run();

      expect(createScraperRun).toHaveBeenCalledWith(
        'Melhores Cartões',
        'https://www.melhorescartoes.com.br/c/promocoes-milhas',
      );
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 1,
        }),
      );
    });

    it('should parse Brazilian date from article', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com bônus',
          dateText: '20/03/2026 às 14:30',
          category: 'Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions[0].detectedAt.getFullYear()).toBe(2026);
      expect(result.promotions[0].detectedAt.getMonth()).toBe(2); // March
      expect(result.promotions[0].detectedAt.getDate()).toBe(20);
    });

    it('should handle articles without category label', async () => {
      const html = `
        <html><body>
          <div class="post-promo-home-container">
            <div class="post-promo-home-c2">
              <h3><a href="https://www.melhorescartoes.com.br/test.html">Smiles oferece bônus nas transferências da Livelo</a></h3>
              <p>Description</p>
              <div class="fim-card"><span class="date">20/03/2026 às 12:00</span></div>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
    });

    it('should handle articles without date', async () => {
      const html = `
        <html><body>
          <div class="post-promo-home-container">
            <div class="post-promo-home-c2">
              <span class="label-card">Milhas</span>
              <h3><a href="https://www.melhorescartoes.com.br/test.html">Smiles com bônus</a></h3>
            </div>
          </div>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      // When no date found, should use current time (detectedAt should be a Date)
      expect(result.promotions[0].detectedAt).toBeInstanceOf(Date);
    });

    it('should handle external links to melhoresdestinos.com.br', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Milheiro Azul a partir de R$ 11,15 transferindo pontos Esfera',
          href: 'https://www.melhoresdestinos.com.br/milhas/pontos-dinheiro-esfera-azul-20mar26',
          category: 'Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].sourceUrl).toBe(
        'https://www.melhoresdestinos.com.br/milhas/pontos-dinheiro-esfera-azul-20mar26',
      );
      expect(result.promotions[0].sourceName).toBe('Melhores Cartões');
    });

    it('should extract rawContent from article text', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com 90% de bônus',
          description: 'Aproveite a promoção imperdível!',
          category: 'Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions[0].rawContent).toContain('Smiles com 90% de bônus');
      expect(result.promotions[0].rawContent).toContain('Aproveite a promoção imperdível!');
    });

    it('should handle mixed promotion with both transfer and purchase keywords', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: '6 promoções que terminam hoje: transferência e compra de pontos com desconto',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('MIXED');
    });

    it('should extract discount percentage from title', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Livelo: até 30% de desconto na compra de pontos',
          category: 'Pontos',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new MelhoresCartoesScraper();

      const result = await scraper.run();

      expect(result.promotions[0].purchaseDiscount).toBe(30);
      expect(result.promotions[0].destinationProgram).toBe('Livelo');
    });
  });
});
