# Web Scraping Skill

## When to Use
Load this skill when implementing scrapers for the promotion tracker, flight data collection, or any web content extraction.

## Tech Stack
- **Cheerio**: For static HTML parsing (preferred — fast, lightweight)
- **Puppeteer**: Only for JavaScript-rendered content that Cheerio can't handle
- **Zod**: Validate all extracted data before storage

## Base Scraper Pattern

```typescript
import * as cheerio from 'cheerio';
import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'scraper' });

interface ScraperConfig {
  name: string;
  baseUrl: string;
  requestDelayMs: number;    // minimum delay between requests
  maxRetries: number;
  timeoutMs: number;
}

abstract class BaseScraper<T> {
  constructor(protected readonly config: ScraperConfig) {}

  abstract parse(html: string): T[];
  abstract getUrls(): string[];

  async fetchWithRetry(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'MilesControl/1.0 (promotion-tracker)',
            'Accept': 'text/html',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.text();
      } catch (error) {
        logger.warn({ err: error, url, attempt }, 'Fetch attempt failed');

        if (attempt === this.config.maxRetries) throw error;

        const delay = this.config.requestDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error('Unreachable');
  }

  async run(): Promise<{ items: T[]; errors: Error[] }> {
    const items: T[] = [];
    const errors: Error[] = [];

    for (const url of this.getUrls()) {
      try {
        await this.respectDelay();
        const html = await this.fetchWithRetry(url);
        const parsed = this.parse(html);
        items.push(...parsed);
      } catch (error) {
        errors.push(error as Error);
        logger.error({ err: error, url, scraper: this.config.name }, 'Scrape failed');
      }
    }

    return { items, errors };
  }

  private lastRequestAt = 0;

  private async respectDelay(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.config.requestDelayMs) {
      await new Promise(resolve =>
        setTimeout(resolve, this.config.requestDelayMs - elapsed)
      );
    }
    this.lastRequestAt = Date.now();
  }
}
```

## Extraction Patterns for Miles Promotions

```typescript
// Common regex patterns for Brazilian miles content
const BONUS_PATTERN = /(\d{1,3})%\s*(?:de\s+)?b[oô]nus/gi;
const DEADLINE_PATTERN = /(?:até|validade|deadline)[:\s]*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi;
const MILHEIRO_PRICE_PATTERN = /R\$\s*(\d{1,3}(?:[.,]\d{2})?)\s*(?:por\s+)?milheiro/gi;
const PROGRAM_NAMES = ['Smiles', 'Latam Pass', 'Azul Fidelidade', 'Livelo', 'Esfera', 'TudoAzul'];
const TRANSFER_PATTERN = /transfer[iê]ncia\s+(?:de\s+)?(?:pontos?\s+)?(\w+)\s+(?:para|→)\s+(\w+)/gi;
```

## Rules
- **Always** check robots.txt before scraping a new domain
- **Never** scrape more than 1 request per 2 seconds per domain
- **Always** validate extracted data with Zod schemas before DB insertion
- **Never** store raw HTML long-term — extract structured data and discard
- **Always** log scraper runs with: source, status, items found, duration, errors
- **Always** implement circuit breaker: if a source fails 3 consecutive runs, pause and alert admin
- **Never** scrape airline account pages — only public blog/promo pages

## Testing
- Save sample HTML pages as fixtures in `__fixtures__/`
- Test parsers against fixtures (deterministic, no network)
- Mock `fetch` in integration tests
- Test error handling: timeout, 404, 500, malformed HTML
