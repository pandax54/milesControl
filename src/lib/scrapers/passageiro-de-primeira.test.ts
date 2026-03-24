import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { load } from 'cheerio';
import type { ScraperRun } from '@/generated/prisma/client';
import { SCRAPER_RUN_STATUS } from './types';
import {
  PassageiroDePrimeiraScraper,
  extractCategories,
  isPromotionRelevant,
  parseDatetime,
} from './passageiro-de-primeira';

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
    id: 'run-pdp-123',
    sourceName: 'Passageiro de Primeira',
    sourceUrl: 'https://passageirodeprimeira.com/',
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
  datetime?: string;
  categories?: string[];
}): string {
  const href = options.href ?? 'https://passageirodeprimeira.com/test-article/';
  const datetime = options.datetime ?? '2026-03-20 15:30:00';
  const cats = options.categories ?? ['Promoções', 'Transferência de pontos'];

  const categoryLinks = cats
    .map((cat) => `<a data-custom-button="border full-radius xs" title="Acessar ${cat}" href="#">${cat}</a>`)
    .join('\n');

  return `
    <article class="card-noticia" title="${options.title}">
      <a class="card-header" title="Acessar ${options.title}" href="${href}">
        <h3>${options.title}</h3>
        <span>
          <strong>Author</strong>
          <time datetime="${datetime}" pubdate>&nbsp;&nbsp;há 1 hora</time>
        </span>
      </a>
      <a class="card-content" title="Acessar ${options.title}" href="${href}">
        <picture><img class="img-cover" src="img.png" alt=""></picture>
      </a>
      <div class="card-footer">
        ${categoryLinks}
      </div>
    </article>
  `;
}

function buildPageHtml(articles: string[]): string {
  return `<html><body>${articles.join('\n')}</body></html>`;
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

// ==================== extractCategories ====================

describe('extractCategories', () => {
  it('should extract category texts from card-footer links', () => {
    const html = buildArticleHtml({
      title: 'Test',
      categories: ['Promoções', 'Transferência de pontos'],
    });
    const $ = load(html);
    const article = $('article.card-noticia').first();

    const categories = extractCategories($, article);

    expect(categories).toEqual(['Promoções', 'Transferência de pontos']);
  });

  it('should return empty array when no categories exist', () => {
    const html = `
      <article class="card-noticia" title="Test">
        <a class="card-header" href="#"><h3>Test</h3></a>
      </article>
    `;
    const $ = load(html);
    const article = $('article.card-noticia').first();

    const categories = extractCategories($, article);

    expect(categories).toEqual([]);
  });

  it('should skip empty text links', () => {
    const html = `
      <article class="card-noticia" title="Test">
        <a class="card-header" href="#"><h3>Test</h3></a>
        <div class="card-footer">
          <a href="#">Promoções</a>
          <a href="#">   </a>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article.card-noticia').first();

    const categories = extractCategories($, article);

    expect(categories).toEqual(['Promoções']);
  });
});

// ==================== isPromotionRelevant ====================

describe('isPromotionRelevant', () => {
  it('should return true for transfer-related category', () => {
    expect(isPromotionRelevant(['Promoções', 'Transferência de pontos'])).toBe(true);
  });

  it('should return true for point purchase category', () => {
    expect(isPromotionRelevant(['Compra de pontos'])).toBe(true);
  });

  it('should return true for flight deals category', () => {
    expect(isPromotionRelevant(['Passagens Aéreas'])).toBe(true);
  });

  it('should return true for banks and cards category', () => {
    expect(isPromotionRelevant(['Bancos e cartões'])).toBe(true);
  });

  it('should return false for non-promotion categories', () => {
    expect(isPromotionRelevant(['Notícias', 'Companhias Aéreas'])).toBe(false);
  });

  it('should return true for compre e pontue category', () => {
    expect(isPromotionRelevant(['Compre e pontue'])).toBe(true);
  });

  it('should return true for programas de fidelidade category', () => {
    expect(isPromotionRelevant(['Programas de fidelidade'])).toBe(true);
  });

  it('should return false for empty categories', () => {
    expect(isPromotionRelevant([])).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(isPromotionRelevant(['TRANSFERÊNCIA DE PONTOS'])).toBe(true);
  });
});

// ==================== parseDatetime ====================

describe('parseDatetime', () => {
  it('should parse datetime in "YYYY-MM-DD HH:mm:ss" format', () => {
    const date = parseDatetime('2026-03-20 19:50:22');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(2); // March = 2 (0-indexed)
    expect(date?.getDate()).toBe(20);
  });

  it('should return undefined for empty string', () => {
    expect(parseDatetime('')).toBeUndefined();
  });

  it('should return undefined for invalid date string', () => {
    expect(parseDatetime('not-a-date')).toBeUndefined();
  });

  it('should handle ISO format already', () => {
    const date = parseDatetime('2026-03-20T15:30:00');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
  });
});

// ==================== PassageiroDePrimeiraScraper ====================

describe('PassageiroDePrimeiraScraper', () => {
  function mockFetchWithHtml(html: string) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(html),
    }));
  }

  describe('constructor', () => {
    it('should construct without triggering a run', () => {
      const scraper = new PassageiroDePrimeiraScraper();

      expect(createScraperRun).not.toHaveBeenCalled(); // not called until run()
    });

    it('should accept config overrides', () => {
      const scraper = new PassageiroDePrimeiraScraper({ delayMs: 5000 });

      expect(scraper).toBeInstanceOf(PassageiroDePrimeiraScraper);
    });
  });

  describe('run (integration via BaseScraper)', () => {
    it('should extract transfer bonus promotions from HTML', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Azul oferece até 133% de bônus nas transferências da Esfera',
          href: 'https://passageirodeprimeira.com/azul-133-bonus/',
          datetime: '2026-03-20 14:00:00',
          categories: ['Promoções', 'Transferência de pontos'],
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].title).toBe('Azul oferece até 133% de bônus nas transferências da Esfera');
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[0].bonusPercent).toBe(133);
      expect(result.promotions[0].sourceProgram).toBe('Esfera');
      expect(result.promotions[0].destinationProgram).toBe('Azul');
      expect(result.promotions[0].sourceName).toBe('Passageiro de Primeira');
      expect(result.promotions[0].sourceUrl).toBe('https://passageirodeprimeira.com/azul-133-bonus/');
    });

    it('should extract point purchase promotions', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          categories: ['Promoções', 'Compra de pontos'],
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('POINT_PURCHASE');
      expect(result.promotions[0].purchaseDiscount).toBe(55);
      expect(result.promotions[0].destinationProgram).toBe('Livelo');
    });

    it('should filter out non-promotion articles', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Lufthansa eleva experiência com produtos de skincare',
          categories: ['Notícias', 'Companhias Aéreas'],
        }),
        buildArticleHtml({
          title: 'Azul oferece bônus nas transferências da Esfera',
          categories: ['Promoções', 'Transferência de pontos'],
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].title).toContain('Azul oferece');
    });

    it('should handle page with no articles', async () => {
      mockFetchWithHtml('<html><body><p>No articles</p></body></html>');
      const scraper = new PassageiroDePrimeiraScraper();

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
          <article class="card-noticia" title="">
            <a class="card-header" href="#"><h3></h3></a>
            <div class="card-footer">
              <a href="#">Transferência de pontos</a>
            </div>
          </article>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(0);
    });

    it('should extract multiple promotions from a page', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Azul oferece até 133% de bônus nas transferências da Esfera',
          categories: ['Promoções', 'Transferência de pontos'],
        }),
        buildArticleHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          categories: ['Promoções', 'Compra de pontos'],
        }),
        buildArticleHtml({
          title: 'LATAM oferta trechos a partir de R$ 173 ou 3 mil milhas',
          categories: ['Promoções', 'Passagens Aéreas'],
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(3);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[1].type).toBe('POINT_PURCHASE');
      expect(result.promotions[2].type).toBe('MIXED');
    });

    it('should use fallback URL when article has no href', async () => {
      const html = `
        <html><body>
          <article class="card-noticia" title="Test promo">
            <a class="card-header" title="Test" href="">
              <h3>Test promo</h3>
              <span><time datetime="2026-03-20 10:00:00" pubdate></time></span>
            </a>
            <div class="card-footer">
              <a href="#">Bancos e cartões</a>
            </div>
          </article>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].sourceUrl).toBe('https://passageirodeprimeira.com/');
    });

    it('should persist scraper run on success', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com 90% de bônus',
          categories: ['Promoções', 'Transferência de pontos'],
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      await scraper.run();

      expect(createScraperRun).toHaveBeenCalledWith(
        'Passageiro de Primeira',
        'https://passageirodeprimeira.com/',
      );
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 1,
        }),
      );
    });

    it('should parse datetime from article time element', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com bônus',
          datetime: '2026-03-20 14:30:00',
          categories: ['Promoções', 'Transferência de pontos'],
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions[0].detectedAt.getFullYear()).toBe(2026);
      expect(result.promotions[0].detectedAt.getMonth()).toBe(2); // March
      expect(result.promotions[0].detectedAt.getDate()).toBe(20);
    });

    it('should classify club signup promotions', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Assine o Clube Smiles com 50% de desconto no primeiro mês',
          categories: ['Promoções', 'Programas de fidelidade'],
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PassageiroDePrimeiraScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('CLUB_SIGNUP');
      expect(result.promotions[0].purchaseDiscount).toBe(50);
    });
  });
});
