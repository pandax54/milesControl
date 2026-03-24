import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { load } from 'cheerio';
import type { ScraperRun } from '@/generated/prisma/client';
import { SCRAPER_RUN_STATUS } from './types';
import {
  PontosPraVoarScraper,
  extractCategory,
  extractDateText,
  extractRawContent,
  parsePtDate,
} from './pontos-pra-voar';

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
    id: 'run-ppv-123',
    sourceName: 'Pontos Pra Voar',
    sourceUrl: 'https://pontospravoar.com/category/promocoes/',
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
  excerpt?: string;
}): string {
  const href = options.href ?? 'https://pontospravoar.com/test-article/';
  const dateText = options.dateText ?? '2 horas atrás';
  const category = options.category ?? 'Promoções';
  const excerpt = options.excerpt ?? 'Preview text of the article.';

  return `
    <article class="post type-post">
      <div class="post-thumbnail-wrap">
        <a href="${href}"><img src="img.webp" alt=""></a>
      </div>
      <div class="post-entry-content">
        <div class="entry-meta">
          <a href="https://pontospravoar.com/category/${category.toLowerCase()}/" class="fancy-categories">${category}</a>
          <span>Por João Silva</span>
          <a href="https://pontospravoar.com/2026/03/20/">${dateText}</a>
        </div>
        <div class="post-entry-title-content">
          <h3 class="entry-title">
            <a href="${href}">${options.title}</a>
          </h3>
        </div>
        <div class="entry-excerpt">${excerpt}</div>
      </div>
    </article>
  `;
}

function buildPageHtml(articles: string[]): string {
  return `<html><body><div class="blog-shortcode">${articles.join('\n')}</div></body></html>`;
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
  it('should extract category from fancy-categories link', () => {
    const html = buildArticleHtml({ title: 'Test', category: 'Promoções' });
    const $ = load(html);
    const article = $('article').first();

    const category = extractCategory(article);

    expect(category).toBe('Promoções');
  });

  it('should return empty string when no fancy-categories link exists', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <div class="entry-meta">
            <span>Por João Silva</span>
          </div>
          <h3 class="entry-title"><a href="#">Test</a></h3>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const category = extractCategory(article);

    expect(category).toBe('');
  });

  it('should trim whitespace from category text', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <div class="entry-meta">
            <a class="fancy-categories">  Acumulando Milhas  </a>
          </div>
          <h3 class="entry-title"><a href="#">Test</a></h3>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const category = extractCategory(article);

    expect(category).toBe('Acumulando Milhas');
  });

  it('should extract first fancy-categories when multiple exist', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <div class="entry-meta">
            <a class="fancy-categories">Milhas</a>
            <a class="fancy-categories">Promoções</a>
          </div>
          <h3 class="entry-title"><a href="#">Test</a></h3>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const category = extractCategory(article);

    expect(category).toBe('Milhas');
  });
});

// ==================== extractDateText ====================

describe('extractDateText', () => {
  it('should extract relative date from entry-meta link', () => {
    const html = buildArticleHtml({ title: 'Test', dateText: '2 horas atrás' });
    const $ = load(html);
    const article = $('article').first();

    const dateText = extractDateText(article);

    expect(dateText).toBe('2 horas atrás');
  });

  it('should extract absolute Portuguese date from entry-meta link', () => {
    const html = buildArticleHtml({ title: 'Test', dateText: '19 de março de 2026' });
    const $ = load(html);
    const article = $('article').first();

    const dateText = extractDateText(article);

    expect(dateText).toBe('19 de março de 2026');
  });

  it('should skip fancy-categories links when searching for date', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <div class="entry-meta">
            <a class="fancy-categories">Promoções</a>
            <a href="/2026/03/20/">3 horas atrás</a>
          </div>
          <h3 class="entry-title"><a href="#">Test</a></h3>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const dateText = extractDateText(article);

    expect(dateText).toBe('3 horas atrás');
  });

  it('should return empty string when no entry-meta exists', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <h3 class="entry-title"><a href="#">Test</a></h3>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const dateText = extractDateText(article);

    expect(dateText).toBe('');
  });

  it('should return empty string when links have no date-like text', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <div class="entry-meta">
            <a class="fancy-categories">Promoções</a>
            <a href="/author/joao/">João Silva</a>
          </div>
          <h3 class="entry-title"><a href="#">Test</a></h3>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const dateText = extractDateText(article);

    expect(dateText).toBe('');
  });
});

// ==================== extractRawContent ====================

describe('extractRawContent', () => {
  it('should combine title and excerpt', () => {
    const html = buildArticleHtml({
      title: 'Smiles com 90% de bônus',
      excerpt: 'Aproveite esta promoção!',
    });
    const $ = load(html);
    const article = $('article').first();

    const content = extractRawContent(article);

    expect(content).toBe('Smiles com 90% de bônus Aproveite esta promoção!');
  });

  it('should return only title when no excerpt exists', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <h3 class="entry-title">Smiles com 90% de bônus</h3>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const content = extractRawContent(article);

    expect(content).toBe('Smiles com 90% de bônus');
  });

  it('should return only title when excerpt is empty', () => {
    const html = `
      <article>
        <div class="post-entry-content">
          <h3 class="entry-title">Test Title</h3>
          <div class="entry-excerpt">   </div>
        </div>
      </article>
    `;
    const $ = load(html);
    const article = $('article').first();

    const content = extractRawContent(article);

    expect(content).toBe('Test Title');
  });
});

// ==================== parsePtDate ====================

describe('parsePtDate', () => {
  const referenceDate = new Date('2026-03-20T12:00:00');

  it('should parse "X horas atrás" format', () => {
    const date = parsePtDate('2 horas atrás', referenceDate);

    expect(date).toBeInstanceOf(Date);
    expect(date?.getHours()).toBe(10);
    expect(date?.getDate()).toBe(20);
  });

  it('should parse singular "1 hora atrás"', () => {
    const date = parsePtDate('1 hora atrás', referenceDate);

    expect(date).toBeInstanceOf(Date);
    expect(date?.getHours()).toBe(11);
  });

  it('should parse "X minutos atrás" format', () => {
    const date = parsePtDate('30 minutos atrás', referenceDate);

    expect(date).toBeInstanceOf(Date);
    expect(date?.getMinutes()).toBe(30);
    expect(date?.getHours()).toBe(11);
  });

  it('should parse singular "1 minuto atrás"', () => {
    const date = parsePtDate('1 minuto atrás', referenceDate);

    expect(date).toBeInstanceOf(Date);
    expect(date?.getMinutes()).toBe(59);
  });

  it('should parse "X dias atrás" format', () => {
    const date = parsePtDate('3 dias atrás', referenceDate);

    expect(date).toBeInstanceOf(Date);
    expect(date?.getDate()).toBe(17);
  });

  it('should parse singular "1 dia atrás"', () => {
    const date = parsePtDate('1 dia atrás', referenceDate);

    expect(date).toBeInstanceOf(Date);
    expect(date?.getDate()).toBe(19);
  });

  it('should parse absolute Portuguese date "19 de março de 2026"', () => {
    const date = parsePtDate('19 de março de 2026');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(2); // March = 2 (0-indexed)
    expect(date?.getDate()).toBe(19);
  });

  it('should parse absolute date for all Portuguese months', () => {
    const months = [
      { name: 'janeiro', index: 0 },
      { name: 'fevereiro', index: 1 },
      { name: 'março', index: 2 },
      { name: 'abril', index: 3 },
      { name: 'maio', index: 4 },
      { name: 'junho', index: 5 },
      { name: 'julho', index: 6 },
      { name: 'agosto', index: 7 },
      { name: 'setembro', index: 8 },
      { name: 'outubro', index: 9 },
      { name: 'novembro', index: 10 },
      { name: 'dezembro', index: 11 },
    ];

    for (const { name, index } of months) {
      const date = parsePtDate(`1 de ${name} de 2026`);
      expect(date?.getMonth()).toBe(index);
    }
  });

  it('should return undefined for empty string', () => {
    expect(parsePtDate('')).toBeUndefined();
  });

  it('should return undefined for non-date text', () => {
    expect(parsePtDate('not-a-date')).toBeUndefined();
  });

  it('should return undefined for unknown month name', () => {
    expect(parsePtDate('1 de invalidmonth de 2026')).toBeUndefined();
  });

  it('should use current time as reference when now is not provided', () => {
    const date = parsePtDate('1 hora atrás');

    expect(date).toBeInstanceOf(Date);
  });
});

// ==================== PontosPraVoarScraper ====================

describe('PontosPraVoarScraper', () => {
  function mockFetchWithHtml(html: string) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(html),
    }));
  }

  describe('constructor', () => {
    it('should construct without triggering a run', () => {
      const scraper = new PontosPraVoarScraper();

      expect(createScraperRun).not.toHaveBeenCalled();
    });

    it('should accept config overrides', () => {
      const scraper = new PontosPraVoarScraper({ delayMs: 5000 });

      expect(scraper).toBeInstanceOf(PontosPraVoarScraper);
    });
  });

  describe('run (integration via BaseScraper)', () => {
    it('should extract transfer bonus promotions from HTML', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Use o pontos + dinheiro na transferência da Esfera para o Azul Fidelidade – milheiro a partir de R$ 11,16',
          href: 'https://pontospravoar.com/use-pontos-dinheiro-transferencia-esfera-azul-fidelidade/',
          dateText: '2 horas atrás',
          category: 'Acumulando Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].title).toBe('Use o pontos + dinheiro na transferência da Esfera para o Azul Fidelidade – milheiro a partir de R$ 11,16');
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[0].sourceProgram).toBe('Esfera');
      expect(result.promotions[0].destinationProgram).toBe('Azul Fidelidade');
      expect(result.promotions[0].sourceName).toBe('Pontos Pra Voar');
      expect(result.promotions[0].sourceUrl).toBe('https://pontospravoar.com/use-pontos-dinheiro-transferencia-esfera-azul-fidelidade/');
    });

    it('should extract point purchase promotions', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

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
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('CLUB_SIGNUP');
      expect(result.promotions[0].purchaseDiscount).toBe(50);
      expect(result.promotions[0].destinationProgram).toBe('Smiles');
    });

    it('should extract transfer bonus with percentage', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Prorrogado! Smiles oferece até 80% de bônus na transferência de pontos Livelo',
          category: 'Acumulando Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[0].bonusPercent).toBe(80);
    });

    it('should handle page with no articles', async () => {
      mockFetchWithHtml('<html><body><p>No articles</p></body></html>');
      const scraper = new PontosPraVoarScraper();

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
          <article class="post">
            <div class="post-entry-content">
              <div class="entry-meta">
                <a class="fancy-categories">Promoções</a>
                <a href="/2026/03/20/">2 horas atrás</a>
              </div>
              <h3 class="entry-title"><a href="#"></a></h3>
            </div>
          </article>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(0);
    });

    it('should extract multiple promotions from a page', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Ganhe até 133% de bônus na transferência de pontos Esfera para o Azul Fidelidade',
          category: 'Acumulando Milhas',
        }),
        buildArticleHtml({
          title: 'Livelo oferece até 55% de desconto na compra de pontos',
          category: 'Promoções',
        }),
        buildArticleHtml({
          title: 'Promoções de milhas, transferências e compra de pontos desta semana',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(3);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
      expect(result.promotions[1].type).toBe('POINT_PURCHASE');
      expect(result.promotions[2].type).toBe('MIXED');
    });

    it('should use fallback URL when article has no href', async () => {
      const html = `
        <html><body>
          <article class="post">
            <div class="post-entry-content">
              <div class="entry-meta">
                <a class="fancy-categories">Promoções</a>
                <a href="/2026/03/20/">2 horas atrás</a>
              </div>
              <h3 class="entry-title"><a href="">Test promo title</a></h3>
            </div>
          </article>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].sourceUrl).toBe('https://pontospravoar.com/category/promocoes/');
    });

    it('should persist scraper run on success', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com 90% de bônus',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      await scraper.run();

      expect(createScraperRun).toHaveBeenCalledWith(
        'Pontos Pra Voar',
        'https://pontospravoar.com/category/promocoes/',
      );
      expect(completeScraperRun).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SCRAPER_RUN_STATUS.SUCCESS,
          itemsFound: 1,
        }),
      );
    });

    it('should parse relative date from article', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-20T14:00:00'));

      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com bônus',
          dateText: '2 horas atrás',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions[0].detectedAt.getHours()).toBe(12);
      expect(result.promotions[0].detectedAt.getDate()).toBe(20);

      vi.useRealTimers();
    });

    it('should parse absolute Portuguese date from article', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com bônus',
          dateText: '19 de março de 2026',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions[0].detectedAt.getFullYear()).toBe(2026);
      expect(result.promotions[0].detectedAt.getMonth()).toBe(2); // March
      expect(result.promotions[0].detectedAt.getDate()).toBe(19);
    });

    it('should handle articles without category label', async () => {
      const html = `
        <html><body>
          <article class="post">
            <div class="post-entry-content">
              <div class="entry-meta">
                <a href="/2026/03/20/">2 horas atrás</a>
              </div>
              <h3 class="entry-title">
                <a href="https://pontospravoar.com/test.html">Smiles oferece bônus nas transferências da Livelo</a>
              </h3>
            </div>
          </article>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('TRANSFER_BONUS');
    });

    it('should handle articles without date', async () => {
      const html = `
        <html><body>
          <article class="post">
            <div class="post-entry-content">
              <h3 class="entry-title">
                <a href="https://pontospravoar.com/test.html">Smiles com bônus</a>
              </h3>
            </div>
          </article>
        </body></html>
      `;
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].detectedAt).toBeInstanceOf(Date);
    });

    it('should extract rawContent from title and excerpt', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Smiles com 90% de bônus',
          excerpt: 'Aproveite a promoção imperdível!',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

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
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].type).toBe('MIXED');
    });

    it('should extract discount percentage from title', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Livelo: até 30% de desconto na compra de pontos',
          category: 'Promoções',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions[0].purchaseDiscount).toBe(30);
      expect(result.promotions[0].destinationProgram).toBe('Livelo');
    });

    it('should extract bonus percentage from title', async () => {
      const html = buildPageHtml([
        buildArticleHtml({
          title: 'Ganhe até 100% de bônus na transferência de pontos Livelo para Smiles',
          category: 'Acumulando Milhas',
        }),
      ]);
      mockFetchWithHtml(html);
      const scraper = new PontosPraVoarScraper();

      const result = await scraper.run();

      expect(result.promotions[0].bonusPercent).toBe(100);
      expect(result.promotions[0].sourceProgram).toBe('Livelo');
      expect(result.promotions[0].destinationProgram).toBe('Smiles');
    });
  });
});
