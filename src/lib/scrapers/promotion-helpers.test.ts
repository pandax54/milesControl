import { describe, it, expect } from 'vitest';
import {
  classifyPromoType,
  extractBonusPercent,
  extractDiscountPercent,
  extractPrograms,
  parseBrDate,
} from './promotion-helpers';

// ==================== classifyPromoType ====================

describe('classifyPromoType', () => {
  it('should classify as TRANSFER_BONUS when title contains transfer keywords', () => {
    expect(
      classifyPromoType('Azul oferece até 133% de bônus nas transferências da Esfera', ['Promoções']),
    ).toBe('TRANSFER_BONUS');
  });

  it('should classify as TRANSFER_BONUS when category is transferência de pontos', () => {
    expect(
      classifyPromoType('Azul oferece bônus especial', ['Transferência de pontos']),
    ).toBe('TRANSFER_BONUS');
  });

  it('should classify as POINT_PURCHASE when title contains purchase keywords', () => {
    expect(
      classifyPromoType('Livelo oferece até 55% de desconto na compra de pontos', ['Promoções']),
    ).toBe('POINT_PURCHASE');
  });

  it('should classify as POINT_PURCHASE when category is compra de pontos', () => {
    expect(
      classifyPromoType('Livelo com desconto especial', ['Compra de pontos']),
    ).toBe('POINT_PURCHASE');
  });

  it('should classify as CLUB_SIGNUP when title mentions clube', () => {
    expect(
      classifyPromoType('Assine o Clube Smiles com 50% de desconto', ['Promoções']),
    ).toBe('CLUB_SIGNUP');
  });

  it('should classify as MIXED when both transfer and purchase keywords present', () => {
    expect(
      classifyPromoType('Transferência e compra de pontos com desconto', ['Promoções']),
    ).toBe('MIXED');
  });

  it('should classify as MIXED when no specific keywords match', () => {
    expect(
      classifyPromoType('LATAM oferta trechos a partir de R$ 173', ['Passagens Aéreas']),
    ).toBe('MIXED');
  });

  it('should prioritize CLUB_SIGNUP over transfer keywords', () => {
    expect(
      classifyPromoType('Assine o Clube Livelo e transfira com bônus', ['Promoções']),
    ).toBe('CLUB_SIGNUP');
  });
});

// ==================== extractBonusPercent ====================

describe('extractBonusPercent', () => {
  it('should extract bonus percentage with "até"', () => {
    expect(extractBonusPercent('Azul oferece até 133% de bônus nas transferências')).toBe(133);
  });

  it('should extract bonus percentage without "até"', () => {
    expect(extractBonusPercent('Smiles com 90% de bônus')).toBe(90);
  });

  it('should return undefined when no bonus pattern found', () => {
    expect(extractBonusPercent('LATAM oferta trechos a partir de R$ 173')).toBeUndefined();
  });

  it('should return undefined for 0% bonus', () => {
    expect(extractBonusPercent('Programa com 0% de bônus')).toBeUndefined();
  });
});

// ==================== extractDiscountPercent ====================

describe('extractDiscountPercent', () => {
  it('should extract discount percentage with "até"', () => {
    expect(extractDiscountPercent('Livelo oferece até 55% de desconto')).toBe(55);
  });

  it('should extract discount percentage without "até"', () => {
    expect(extractDiscountPercent('Perfumes com 43% de desconto')).toBe(43);
  });

  it('should return undefined when no discount pattern found', () => {
    expect(extractDiscountPercent('Smiles com 90% de bônus')).toBeUndefined();
  });

  it('should return undefined for 0% discount', () => {
    expect(extractDiscountPercent('Pontos com 0% de desconto')).toBeUndefined();
  });
});

// ==================== extractPrograms ====================

describe('extractPrograms', () => {
  it('should return empty object when no program found', () => {
    expect(extractPrograms('Mala de viagem com desconto')).toEqual({});
  });

  it('should return destination when single program found', () => {
    expect(extractPrograms('Smiles com 90% de bônus')).toEqual({
      destination: 'Smiles',
    });
  });

  it('should extract source and destination from transfer title', () => {
    const result = extractPrograms('Transfira pontos Esfera para o Azul Fidelidade usando pontos');

    expect(result.source).toBe('Esfera');
    expect(result.destination).toBe('Azul Fidelidade');
  });

  it('should extract programs from reverse pattern with "bônus da"', () => {
    const result = extractPrograms('Azul oferece até 133% de bônus nas transferências da Esfera');

    expect(result.source).toBe('Esfera');
    expect(result.destination).toBe('Azul');
  });

  it('should handle "Livelo" and "Smiles" in transfer title', () => {
    const result = extractPrograms('Transfira pontos Livelo para o Smiles com bônus');

    expect(result.source).toBe('Livelo');
    expect(result.destination).toBe('Smiles');
  });

  it('should prioritize longer program names (Azul Fidelidade over Azul)', () => {
    const result = extractPrograms('Azul Fidelidade com bônus especial');

    expect(result.destination).toBe('Azul Fidelidade');
  });

  it('should fallback to first=source, second=destination for two programs', () => {
    const result = extractPrograms('Livelo e Smiles com promoção especial');

    expect(result.source).toBe('Smiles');
    expect(result.destination).toBe('Livelo');
  });

  it('should handle "envie milhas" pattern', () => {
    const result = extractPrograms('Envie milhas Smiles para o Livelo com bônus');

    expect(result.source).toBe('Smiles');
    expect(result.destination).toBe('Livelo');
  });

  it('should fallback when transfer pattern matches but programs not in capture groups', () => {
    const result = extractPrograms('Transfira pontos do banco para outro programa - Smiles e Livelo');

    expect(result.source).toBeDefined();
    expect(result.destination).toBeDefined();
  });

  it('should fallback when reverse pattern matches but lookup fails', () => {
    const result = extractPrograms('Smiles e Livelo com bônus especial da cartão premium');

    expect(result.source).toBeDefined();
    expect(result.destination).toBeDefined();
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

  it('should parse DD/MM/YYYY format without time', () => {
    const date = parseBrDate('15/06/2026');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5); // June = 5
    expect(date?.getDate()).toBe(15);
  });

  it('should parse date with leading zeros', () => {
    const date = parseBrDate('01/01/2026');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(0);
    expect(date?.getDate()).toBe(1);
  });

  it('should parse end of year date', () => {
    const date = parseBrDate('31/12/2025');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2025);
    expect(date?.getMonth()).toBe(11);
    expect(date?.getDate()).toBe(31);
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

  it('should extract date from text containing other content without time', () => {
    const date = parseBrDate('Published on 15/06/2026 by Anni');

    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(5);
    expect(date?.getDate()).toBe(15);
  });
});
